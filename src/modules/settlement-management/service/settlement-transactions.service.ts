import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { IncomingPaymentSource } from 'src/shared/enum';
import {
  SettlementTransactions,
  SettlementTransactionStatus,
} from '../entity/settlement_transactions.entity';
import { BusinessSettlementType } from '../entity/business_settlement_config.entity';
import { SettlementTransactionItems } from '../entity/settlement_transaction_items.entity';
import { Settlements } from '../entity/settlements.entity';

type UpsertUnsettledBucketInput = {
  businessId: string;
  environment: string;
  paymentSource: IncomingPaymentSource;
  settlementType: BusinessSettlementType;
  settlementBankAccountId: string | null;
  walletId?: string | null;
  amount: bigint;
  status?: SettlementTransactionStatus;
  settledAt?: Date | null;
};

type RecordSettlementTransactionItemInput = {
  businessId: string;
  environment: string;
  settlementTransactionsId: string;
  transactionId: string;
  amount: bigint;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class SettlementTransactionsService {
  constructor(
    @InjectRepository(Settlements)
    private readonly settlementRepo: Repository<Settlements>,
    @InjectRepository(SettlementTransactions)
    private readonly settlementTxnRepo: Repository<SettlementTransactions>,
    @InjectRepository(SettlementTransactionItems)
    private readonly settlementTxnItemRepo: Repository<SettlementTransactionItems>,
  ) {}

  async upsertUnsettledBucket(
    input: UpsertUnsettledBucketInput,
    entityManager?: EntityManager,
  ) {
    return this.upsertSettlementBucket(
      { ...input, status: SettlementTransactionStatus.UNSETTLED },
      entityManager,
    );
  }

  async upsertSettlementBucket(
    input: UpsertUnsettledBucketInput,
    entityManager?: EntityManager,
  ) {
    const repo =
      entityManager?.getRepository(SettlementTransactions) ??
      this.settlementTxnRepo;
    const nextSettlementDate = new Date();
    nextSettlementDate.setDate(nextSettlementDate.getDate() + 1);
    let settledToday = new Date().toISOString().slice(0, 10);
    const settlementDate =
      input.settlementType == BusinessSettlementType.T_PLUS_1
        ? nextSettlementDate.toISOString().slice(0, 10)
        : settledToday;
    const status = input.status ?? SettlementTransactionStatus.UNSETTLED;
    const settledAt =
      status === SettlementTransactionStatus.SETTLED
        ? (input.settledAt ?? new Date())
        : null;
    const settlement = await this.upsertDailySettlement(
      {
        ...input,
        status,
        settledAt,
        settlementDate,
      },
      entityManager,
    );

    const existing = await repo.findOne({
      where: {
        settlementId: settlement.settlementId,
        businessId: input.businessId,
        environment: input.environment,
        paymentSource: input.paymentSource,
        settlementType: input.settlementType,
        settlementbankAccountId: input.settlementBankAccountId ?? IsNull(),
        walletId: input.walletId ?? IsNull(),
        status,
        settlementDate,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (existing) {
      existing.expectedSettledAmount = (
        BigInt(existing.expectedSettledAmount) + input.amount
      ).toString();

      if (status === SettlementTransactionStatus.SETTLED) {
        existing.settledAmount = (
          BigInt(existing.settledAmount) + input.amount
        ).toString();
        existing.settledAt = existing.settledAt ?? settledAt;
      }

      return repo.save(existing);
    }

    const bucket = repo.create({
      businessId: input.businessId,
      environment: input.environment,
      settlementId: settlement.settlementId,
      paymentSource: input.paymentSource,
      settlementType: input.settlementType,
      settlementbankAccountId: input.settlementBankAccountId,
      walletId: input.walletId ?? null,
      expectedSettledAmount: input.amount.toString(),
      settledAmount:
        status === SettlementTransactionStatus.SETTLED
          ? input.amount.toString()
          : '0',
      settledAt,
      status,
      settlementDate,
    });

    return repo.save(bucket);
  }

  private async upsertDailySettlement(
    input: UpsertUnsettledBucketInput & {
      status: SettlementTransactionStatus;
      settlementDate: string;
    },
    entityManager?: EntityManager,
  ) {
    const repo =
      entityManager?.getRepository(Settlements) ?? this.settlementRepo;

    const existing = await repo.findOne({
      where: {
        businessId: input.businessId,
        environment: input.environment,
        paymentSource: input.paymentSource,
        settlementType: input.settlementType,
        status: input.status,
        settlementDate: input.settlementDate,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (existing) {
      existing.expectedSettledAmount = (
        BigInt(existing.expectedSettledAmount) + input.amount
      ).toString();

      if (input.status === SettlementTransactionStatus.SETTLED) {
        existing.settledAmount = (
          BigInt(existing.settledAmount) + input.amount
        ).toString();
        existing.settledAt =
          existing.settledAt ?? input.settledAt ?? new Date();
      }

      return repo.save(existing);
    }

    return repo.save(
      repo.create({
        businessId: input.businessId,
        environment: input.environment,
        paymentSource: input.paymentSource,
        settlementType: input.settlementType,
        expectedSettledAmount: input.amount.toString(),
        settledAmount:
          input.status === SettlementTransactionStatus.SETTLED
            ? input.amount.toString()
            : '0',
        settledAt:
          input.status === SettlementTransactionStatus.SETTLED
            ? (input.settledAt ?? new Date())
            : null,
        status: input.status,
        settlementDate: input.settlementDate,
      }),
    );
  }

  async recordSettlementTransactionItem(
    input: RecordSettlementTransactionItemInput,
    entityManager?: EntityManager,
  ) {
    const repo =
      entityManager?.getRepository(SettlementTransactionItems) ??
      this.settlementTxnItemRepo;

    const existing = await repo.findOne({
      where: {
        settlementTransactionsId: input.settlementTransactionsId,
        transactionId: input.transactionId,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (existing) {
      existing.amount = input.amount.toString();
      existing.metadata = input.metadata ?? existing.metadata;

      return repo.save(existing);
    }

    return repo.save(
      repo.create({
        businessId: input.businessId,
        environment: input.environment,
        settlementTransactionsId: input.settlementTransactionsId,
        transactionId: input.transactionId,
        amount: input.amount.toString(),
        metadata: input.metadata ?? null,
      }),
    );
  }
}
