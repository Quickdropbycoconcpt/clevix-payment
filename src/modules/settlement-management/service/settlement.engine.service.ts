import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisConfig } from 'src/infrastructure/redis/redis.config';
import { In, LessThanOrEqual, Repository } from 'typeorm';
import {
  SettlementTransactions,
  SettlementTransactionStatus,
} from '../entity/settlement_transactions.entity';
import { Settlements } from '../entity/settlements.entity';
import { RequestEnvironment, LedgerEntryDirection } from 'src/shared/enum';
import { SettlementQueue } from '../jobs/settlement.queue';
import { ExternalBankSettlement } from '../interface/business-settlement-config.interface';
import { TransferAdapterFactory } from 'src/modules/Api/transfers/adapters/transfer.adapter.factory';
import { TransferProvider } from 'src/modules/Api/transfers/types/transfer-provider';
import { LedgerService } from 'src/modules/ledger/service/ledger.service';
import {
  LedgerAccountOwnerType,
  LedgerAccountType,
} from 'src/modules/ledger/enums/ledger.enums';

import {
  SettlementPayoutAttempts,
  SettlementPayoutAttemptStatus,
} from '../entity/settlement_payout_attempt.entity';

@Injectable()
export class SettlementEngineService {
  private readonly logger = new Logger(SettlementEngineService.name);
  private readonly redis = new RedisConfig();

  constructor(
    @InjectRepository(Settlements)
    private readonly settlementRepo: Repository<Settlements>,
    @InjectRepository(SettlementTransactions)
    private readonly settlementTxnRepo: Repository<SettlementTransactions>,
    @InjectRepository(SettlementPayoutAttempts)
    private readonly payoutAttemptRepo: Repository<SettlementPayoutAttempts>,
    private readonly settlementQueue: SettlementQueue,
    private readonly transferAdapterFactory: TransferAdapterFactory,
    private readonly ledgerService: LedgerService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async settledPendingTransactions() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const settlements = await this.settlementRepo.find({
        where: {
          status: SettlementTransactionStatus.UNSETTLED,
          settlementDate: LessThanOrEqual(today),
          environment: RequestEnvironment.LIVE,
        },
        relations: {
          transactions: true,
        },
      });
      if (settlements.length == 0) {
        return;
      }
      for (const settlement of settlements) {
        if (settlement.transactions.length == 0) {
          continue;
        }
        const unsettledTransactions = settlement.transactions.filter(
          (txn) => txn.status === SettlementTransactionStatus.UNSETTLED,
        );

        for (const txn of unsettledTransactions) {
          await this.settlementQueue.addSettlementTransactionJob({
            transactionId: txn.settlementTransactionsId,
          });
          await this.settlementTxnRepo.update(
            { settlementTransactionsId: txn.settlementTransactionsId },
            { status: SettlementTransactionStatus.QUEUED },
          );
        }
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  async processExternalSettlementPayout(
    settlementTransaction: SettlementTransactions,
    input: ExternalBankSettlement,
  ) {
    const provider = TransferProvider.VFD;
    const attempt = await this.getOrCreateExternalPayoutAttempt(
      settlementTransaction,
      input,
      provider,
    );

    if (
      [
        SettlementPayoutAttemptStatus.PROCESSING,
        SettlementPayoutAttemptStatus.PENDING_CONFIRMATION,
        SettlementPayoutAttemptStatus.SUCCESS,
      ].includes(attempt.status)
    ) {
      return attempt;
    }

    const adapter = this.transferAdapterFactory.getTransferdapter(provider);
    const payoutInput = {
      amount: input.amount,
      bankCode: input.bankCode,
      merchantReference: input.merchantReference ?? attempt.reference,
      reference: attempt.reference,
      narration: input.narration ?? 'Settlement payout',
      currency: input.currency,
      senderAccount: input.senderAccount,
      accountNumber: input.accountNumber,
      environment: input.environment,
      accountName: input.accountName,
      provider,
    };

    await this.payoutAttemptRepo.update(
      { payoutAttemptId: attempt.payoutAttemptId },
      {
        status: SettlementPayoutAttemptStatus.PROCESSING,
        requestedAt: new Date(),
        rawRequest: payoutInput,
      },
    );

    try {
      const response = await adapter.processPaypout(payoutInput);

      await this.payoutAttemptRepo.update(
        { payoutAttemptId: attempt.payoutAttemptId },
        {
          status: SettlementPayoutAttemptStatus.PROCESSING,
          rawResponse: this.toRecord(response),
        },
      );
      await this.postExternalSettlementLedger(
        settlementTransaction,
        input.currency,
      );
      await this.settlementTxnRepo.update(
        {
          settlementTransactionsId:
            settlementTransaction.settlementTransactionsId,
        },
        { status: SettlementTransactionStatus.PROCESSING },
      );

      return this.payoutAttemptRepo.findOne({
        where: { payoutAttemptId: attempt.payoutAttemptId },
      });
    } catch (error) {
      await this.payoutAttemptRepo.update(
        { payoutAttemptId: attempt.payoutAttemptId },
        {
          status: SettlementPayoutAttemptStatus.PENDING_CONFIRMATION,
          failureReason:
            error instanceof Error ? error.message : 'Settlement payout failed',
          rawResponse: this.toRecord(error),
        },
      );
      await this.settlementTxnRepo.update(
        {
          settlementTransactionsId:
            settlementTransaction.settlementTransactionsId,
        },
        { status: SettlementTransactionStatus.PROCESSING },
      );

      return this.payoutAttemptRepo.findOne({
        where: { payoutAttemptId: attempt.payoutAttemptId },
      });
    }
  }

  private async getOrCreateExternalPayoutAttempt(
    settlementTransaction: SettlementTransactions,
    input: ExternalBankSettlement,
    provider: TransferProvider,
  ) {
    const existingAttempt = await this.payoutAttemptRepo.findOne({
      where: {
        settlementTransactionsId:
          settlementTransaction.settlementTransactionsId,
      },
      order: { createdAt: 'DESC' },
    });

    if (
      existingAttempt &&
      existingAttempt.status !== SettlementPayoutAttemptStatus.FAILED
    ) {
      return existingAttempt;
    }

    const reference = existingAttempt
      ? `${settlementTransaction.settlementTransactionsId}-${Date.now()}`
      : settlementTransaction.settlementTransactionsId;

    return this.payoutAttemptRepo.save(
      this.payoutAttemptRepo.create({
        businessId: settlementTransaction.businessId,
        environment: settlementTransaction.environment,
        settlementTransactionsId:
          settlementTransaction.settlementTransactionsId,
        provider,
        reference,
        providerReference: null,
        amount: input.amount,
        currency: input.currency,
        destinationAccountNumber: input.accountNumber,
        destinationAccountName: input.accountName,
        destinationBankCode: input.bankCode,
        status: SettlementPayoutAttemptStatus.PENDING,
        failureReason: null,
        requestedAt: null,
        confirmedAt: null,
        rawRequest: null,
        rawResponse: null,
        metadata: {
          settlementId: settlementTransaction.settlementId,
          paymentSource: settlementTransaction.paymentSource,
          settlementType: settlementTransaction.settlementType,
          merchantReference: input.merchantReference,
        },
      }),
    );
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async validateExternalSettlementStatus() {
    try {
      const processingAttempts = await this.payoutAttemptRepo.find({
        where: {
          status: In([
            SettlementPayoutAttemptStatus.PROCESSING,
            SettlementPayoutAttemptStatus.PENDING_CONFIRMATION,
          ]),
          environment: RequestEnvironment.LIVE,
        },
        relations: { settlementTransaction: true },
        order: { createdAt: 'ASC' },
        take: 200,
      });

      if (processingAttempts.length == 0) {
        return;
      }

      const adapter = this.transferAdapterFactory.getTransferdapter(
        TransferProvider.VFD,
      );

      for (const attempt of processingAttempts) {
        const result = await adapter.transactionStatusQuery({
          environment: attempt.environment,
          reference: attempt.reference,
        });

        if (!result.success) {
          continue;
        }

        await this.postExternalSettlementLedger(
          attempt.settlementTransaction,
          attempt.currency,
        );
        await this.payoutAttemptRepo.update(
          { payoutAttemptId: attempt.payoutAttemptId },
          {
            status: SettlementPayoutAttemptStatus.SUCCESS,
            providerReference: result.sessionId ?? attempt.providerReference,
            confirmedAt: new Date(),
            rawResponse: this.toRecord(result),
          },
        );
        await this.settlementTxnRepo.update(
          {
            settlementTransactionsId: attempt.settlementTransactionsId,
          },
          {
            status: SettlementTransactionStatus.SETTLED,
            settledAmount: attempt.settlementTransaction.expectedSettledAmount,
            settledAt: new Date(),
          },
        );
        await this.markParentSettlementSettledIfComplete(
          attempt.settlementTransaction.settlementId,
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to validate external settlement status',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return { value };
  }

  private async markParentSettlementSettledIfComplete(
    settlementId: string | null,
  ) {
    if (!settlementId) {
      return;
    }

    await this.settlementRepo.manager.transaction(async (entityManager) => {
      const settlementRepo = entityManager.getRepository(Settlements);
      const settlementTxnRepo = entityManager.getRepository(
        SettlementTransactions,
      );
      const settlement = await settlementRepo.findOne({
        where: { settlementId },
        lock: { mode: 'pessimistic_write' },
      });

      if (
        !settlement ||
        settlement.status === SettlementTransactionStatus.SETTLED
      ) {
        return;
      }

      const children = await settlementTxnRepo.find({
        where: { settlementId },
      });

      if (
        children.length == 0 ||
        children.some(
          (child) => child.status !== SettlementTransactionStatus.SETTLED,
        )
      ) {
        return;
      }

      settlement.settledAmount = children
        .reduce((sum, child) => sum + BigInt(child.settledAmount), 0n)
        .toString();
      settlement.settledAt = new Date();
      settlement.status = SettlementTransactionStatus.SETTLED;

      await settlementRepo.save(settlement);
    });
  }

  async postExternalSettlementLedger(
    settlementTransaction: SettlementTransactions,
    currency = 'NGN',
  ) {
    const reference = `settlement-payout:${settlementTransaction.settlementTransactionsId}`;

    return this.settlementTxnRepo.manager.transaction(async (entityManager) => {
      const existingLedgerTransaction =
        await this.ledgerService.getLedgerTransactionByReference(
          reference,
          entityManager,
        );

      if (existingLedgerTransaction) {
        return existingLedgerTransaction;
      }

      const settlementPayableLedger =
        await this.ledgerService.findOrCreateLedgerAccount(
          {
            ownerId: settlementTransaction.businessId,
            ownerType: LedgerAccountOwnerType.BUSINESS,
            accountType: LedgerAccountType.SETTLEMENT_PAYABLE,
            currency,
            environment: settlementTransaction.environment,
          },
          entityManager,
        );
      const payoutClearingLedger =
        await this.ledgerService.findOrCreateLedgerAccount(
          {
            ownerId: 'clevix-settlement-clearing',
            ownerType: LedgerAccountOwnerType.SYSTEM,
            accountType: LedgerAccountType.PAYOUTS_CLEARING,
            currency,
            environment: settlementTransaction.environment,
          },
          entityManager,
        );

      return this.ledgerService.ledgerPosting(
        {
          reference,
          environment: settlementTransaction.environment,
          businessId: settlementTransaction.businessId,
          transactionType: 'SETTLEMENT_PAYOUT',
          description: 'External bank settlement payout initiated',
          amount: settlementTransaction.expectedSettledAmount,
          currency,
          metadata: {
            settlementTransactionsId:
              settlementTransaction.settlementTransactionsId,
            settlementId: settlementTransaction.settlementId,
            settlementBankAccountId:
              settlementTransaction.settlementbankAccountId,
            paymentSource: settlementTransaction.paymentSource,
            settlementType: settlementTransaction.settlementType,
          },
          entries: [
            {
              ledgerAccountId: settlementPayableLedger.ledgerAccountId,
              direction: LedgerEntryDirection.DEBIT,
              amount: settlementTransaction.expectedSettledAmount,
              memo: 'Reduce business settlement payable',
            },
            {
              ledgerAccountId: payoutClearingLedger.ledgerAccountId,
              direction: LedgerEntryDirection.CREDIT,
              amount: settlementTransaction.expectedSettledAmount,
              memo: 'External payout clearing',
            },
          ],
        },
        entityManager,
      );
    });
  }
}
