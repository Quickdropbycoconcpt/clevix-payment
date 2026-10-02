import { Injectable, NotFoundException } from '@nestjs/common';
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
import { SettlementBankAccounts } from '../entity/settlement_accounts.entity';
import { TaxTransaction } from 'src/modules/tax-management/entity/tax-transaction.entity';
import { getBusinessScope, RequestScope } from 'src/shared/business-scope';
import { createOffsetPaginatedResponse } from 'src/shared/http/pagination';
import { ListSettlementsQueryDto } from '../dto/list-settlements-query.dto';
import { parseDateRange } from 'src/shared/http/date-range';
import { generateReadableReference } from 'src/shared/utils';

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
      reference: generateReadableReference('STX'),
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
        reference: generateReadableReference('STL'),
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

  async listSettlements(scope: RequestScope, filters: ListSettlementsQueryDto) {
    const { businessId, environment, pagination } = getBusinessScope(scope);

    const query = this.settlementRepo
      .createQueryBuilder('settlement')
      .where('settlement.businessId = :businessId', { businessId })
      .andWhere('settlement.environment = :environment', { environment })
      .orderBy('settlement.settlementDate', 'DESC')
      .addOrderBy('settlement.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.take);

    if (filters.status) {
      query.andWhere('settlement.status = :status', {
        status: filters.status,
      });
    }

    const { from, to } = parseDateRange(filters);
    if (from) {
      query.andWhere('settlement.settlementDate >= :from', { from });
    }
    if (to) {
      query.andWhere('settlement.settlementDate <= :to', { to });
    }

    const [settlements, total] = await query.getManyAndCount();

    return createOffsetPaginatedResponse(settlements, pagination, { total });
  }

  private async findScopedSettlementTransaction(
    scope: RequestScope,
    settlementId: string,
    settlementTransactionsId: string,
  ) {
    const { businessId, environment } = getBusinessScope(scope);

    const settlementTransaction = await this.settlementTxnRepo.findOne({
      where: {
        settlementTransactionsId: settlementTransactionsId.trim(),
        settlementId: settlementId.trim(),
        businessId,
        environment,
      },
    });

    if (!settlementTransaction) {
      throw new NotFoundException('Settlement transaction not found');
    }

    return settlementTransaction;
  }

  async listSettlementTransactionItems(
    scope: RequestScope,
    settlementId: string,
    settlementTransactionsId: string,
  ) {
    const { pagination } = getBusinessScope(scope);
    const settlementTransaction = await this.findScopedSettlementTransaction(
      scope,
      settlementId,
      settlementTransactionsId,
    );

    const [items, total] = await this.settlementTxnItemRepo.findAndCount({
      where: {
        settlementTransactionsId:
          settlementTransaction.settlementTransactionsId,
      },
      relations: { transaction: true },
      order: { createdAt: 'DESC' },
      skip: pagination.skip,
      take: pagination.take,
    });

    return createOffsetPaginatedResponse(items, pagination, { total });
  }

  async getSettlementTransactionAnalytics(
    scope: RequestScope,
    settlementId: string,
    settlementTransactionsId: string,
  ) {
    const settlementTransaction = await this.findScopedSettlementTransaction(
      scope,
      settlementId,
      settlementTransactionsId,
    );

    const { count, totalAmount } = await this.settlementTxnItemRepo
      .createQueryBuilder('item')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(item.amount), 0)', 'totalAmount')
      .where('item.settlementTransactionsId = :settlementTransactionsId', {
        settlementTransactionsId:
          settlementTransaction.settlementTransactionsId,
      })
      .getRawOne<{ count: string; totalAmount: string }>();

    return {
      reference:
        settlementTransaction.reference ??
        settlementTransaction.settlementTransactionsId,
      count: Number(count),
      totalAmount,
    };
  }

  async listSettlementTransactions(scope: RequestScope, settlementId: string) {
    const { businessId, environment, pagination } = getBusinessScope(scope);

    const settlement = await this.settlementRepo.findOne({
      where: { settlementId: settlementId.trim(), businessId, environment },
    });

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    const [transactions, total] = await this.settlementTxnRepo
      .createQueryBuilder('txn')
      .where('txn.settlementId = :settlementId', {
        settlementId: settlement.settlementId,
      })
      .andWhere('txn.businessId = :businessId', { businessId })
      .andWhere('txn.environment = :environment', { environment })
      .leftJoinAndMapOne(
        'txn.settlementBankAccount',
        SettlementBankAccounts,
        'bankAccount',
        'bankAccount.bankAccountId = txn.settlementbankAccountId',
      )
      .leftJoinAndSelect('bankAccount.bank', 'bank')
      .orderBy('txn.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.take)
      .getManyAndCount();

    const taxAmountBySettlementTransactionsId = transactions.length
      ? await this.getTaxAmountsBySettlementTransactionsId(
          transactions.map((txn) => txn.settlementTransactionsId),
        )
      : new Map<string, string>();

    const transactionsWithTax = transactions.map((txn) => ({
      ...txn,
      taxAmount:
        taxAmountBySettlementTransactionsId.get(
          txn.settlementTransactionsId,
        ) ?? '0',
    }));

    return createOffsetPaginatedResponse(transactionsWithTax, pagination, {
      total,
    });
  }

  private async getTaxAmountsBySettlementTransactionsId(
    settlementTransactionsIds: string[],
  ): Promise<Map<string, string>> {
    const rows = await this.settlementTxnItemRepo
      .createQueryBuilder('item')
      .innerJoin(
        TaxTransaction,
        'tax',
        'tax.transactionId = item.transactionId',
      )
      .select('item.settlementTransactionsId', 'settlementTransactionsId')
      .addSelect('SUM(tax.taxAmount)', 'taxAmount')
      .where('item.settlementTransactionsId IN (:...settlementTransactionsIds)', {
        settlementTransactionsIds,
      })
      .groupBy('item.settlementTransactionsId')
      .getRawMany<{ settlementTransactionsId: string; taxAmount: string }>();

    return new Map(
      rows.map((row) => [row.settlementTransactionsId, row.taxAmount]),
    );
  }
}
