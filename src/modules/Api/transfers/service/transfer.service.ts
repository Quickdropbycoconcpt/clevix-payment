import { Injectable } from '@nestjs/common';
import { TransferAdapterFactory } from '../adapters/transfer.adapter.factory';
import { TransferProvider } from '../types/transfer-provider';
import { WalletService } from 'src/modules/wallets/service/wallets.service';
import { WithdrawalDto } from '../dto/transfer.dto';
import { RequestScope } from 'src/shared/business-scope';
import { TransactionSource, TransactionStatus } from 'src/shared/enum';
import { AddTransferIntoQue } from '../job/transfer-queue-job';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionService } from 'src/modules/transactions/service/transaction.service';

@Injectable()
export class TransferService {
  constructor(
    private readonly transferAdapterFactory: TransferAdapterFactory,
    private readonly walletService: WalletService,
    private readonly txnService: TransactionService,
    private readonly transferQueue: AddTransferIntoQue,
  ) {}

  async processPayout(dto: WithdrawalDto, scope: RequestScope) {
    const {
      accountName,
      accountNumber,
      narration,
      currency,
      bankCode,
      reference,
      senderAccount,
      amount,
    } = dto;
    const { businessId, environment } = scope;
    const provider = TransferProvider.VFD; //this should be dynamic....
    /**
     * We determine the provider ourselves
     */
    await this.walletService.debitUserWallet({
      amount,
      environment,
      businessId,
      narration,
      source: TransactionSource.TRANSFER,
      provider,
      reference,
      currency,
    });

    await this.transferQueue.addTransferProcessingQueue({
      accountName,
      accountNumber,
      narration,
      bankCode,
      environment,
      currency,
      senderAccount,
      provider,
      merchantReference: reference,
      reference,
      amount,
    });
  }

  @Cron(CronExpression.EVERY_SECOND)
  async transactionStatusQuery() {
    const BATCH_SIZE = 200;
    const txns = await this.txnService.getInitiatedOrProcessingTransferTxn({
      batchSize: BATCH_SIZE,
    });
    if (txns.length == 0) {
      return;
    }

    for (const txn of txns) {
      const provider = txn.provider;
      const adapter = this.transferAdapterFactory.getTransferdapter(provider);
      const result = await adapter.transactionStatusQuery({
        environment: txn.environment,
        reference: txn.reference,
      });
      this.txnService.updateTransactionBySystemReference(result.reference, {
        executionStatus: result.success
          ? TransactionStatus.SUCCESS
          : TransactionStatus.FAILED,
      });
    }
  }
}
