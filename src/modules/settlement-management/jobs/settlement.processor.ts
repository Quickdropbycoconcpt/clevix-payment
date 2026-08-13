import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { SettlementTransactions } from '../entity/settlement_transactions.entity';
import {
  SETTLEMENT_QUEUE,
  SettlementTransactionJobData,
} from './settlement.job';
import { SettlementEngineService } from '../service/settlement.engine.service';

@Injectable()
@Processor(SETTLEMENT_QUEUE)
export class SettlementProcessor extends WorkerHost {
  private readonly logger = new Logger(SettlementProcessor.name);

  constructor(
    @InjectRepository(SettlementTransactions)
    private readonly settlementTxnRepo: Repository<SettlementTransactions>,
    private readonly settlementEngineService: SettlementEngineService,
  ) {
    super();
  }

  async process(job: Job<SettlementTransactionJobData>) {
    const { transactionId } = job.data;

    this.logger.log(
      `Processing settlement transaction job ${job.id} for ${transactionId}`,
    );

    const settlementTransaction = await this.settlementTxnRepo.findOne({
      where: { settlementTransactionsId: transactionId },
      relations: {
        settlementBankAccount: {
          bank: true,
        },
        wallet: true,
        settlement: true,
      },
    });

    if (!settlementTransaction) {
      this.logger.warn(
        `Settlement transaction ${transactionId} was not found, skipping job ${job.id}`,
      );

      return {
        processed: false,
        transactionId,
        reason: 'Settlement transaction not found',
      };
    }

    if (settlementTransaction.settlementbankAccountId != null) {
      if (!settlementTransaction.settlementBankAccount) {
        this.logger.warn(
          `Settlement bank account ${settlementTransaction.settlementbankAccountId} was not found for transaction ${transactionId}`,
        );

        return {
          processed: false,
          transactionId,
          reason: 'Settlement bank account not found',
        };
      }

      if (!settlementTransaction.settlementBankAccount.bank) {
        this.logger.warn(
          `Bank ${settlementTransaction.settlementBankAccount.providerbankId} was not found for settlement account ${settlementTransaction.settlementbankAccountId}`,
        );

        return {
          processed: false,
          transactionId,
          reason: 'Settlement bank relation not found',
        };
      }

      await this.settlementEngineService.processExternalSettlementPayout(
        settlementTransaction,
        {
          amount: settlementTransaction.expectedSettledAmount,
          accountNumber:
            settlementTransaction.settlementBankAccount.accountNumber,
          accountName: settlementTransaction.settlementBankAccount.accountName,
          bankCode: settlementTransaction.settlementBankAccount.bank.bankCode,
          currency: 'NGN',
          reference: settlementTransaction.settlementTransactionsId,
          environment: settlementTransaction.environment,
          narration: 'Settlement payout',
          merchantReference: settlementTransaction.settlementTransactionsId,
        },
      );
    }

    return {
      processed: true,
      transactionId,
    };
  }
}
