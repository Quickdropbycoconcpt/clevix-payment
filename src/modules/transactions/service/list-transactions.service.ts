import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Transactions } from '../entity/transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { getBusinessScope, RequestScope } from 'src/shared/business-scope';
import { createOffsetPaginatedResponse } from 'src/shared/http/pagination';
import { parseDateRange } from 'src/shared/http/date-range';
import { ListTransactionsQueryDto } from '../dto/list-transactions-query.dto';

@Injectable()
export class TransactionsServiceListing {
  constructor(
    @InjectRepository(Transactions)
    private readonly transactionRepo: Repository<Transactions>,
  ) {}

  async listTransactions(
    scope: RequestScope,
    filters: ListTransactionsQueryDto,
  ) {
    const { businessId, environment, pagination } = getBusinessScope(scope);
    const { from, to } = parseDateRange(filters);

    const qb = this.transactionRepo
      .createQueryBuilder('txn')
      .select([
        'txn.transactionId',
        'txn.expectedAmount',
        'txn.settledAmount',
        'txn.fee',
        'txn.createdAt',
        'txn.executionStatus',
        'txn.source',
        'txn.collectionChannel',
        'txn.settlementStatus',
        'txn.direction',
        'txn.reference',
        'txn.merchantReference',
        'txn.currency',
      ])
      .where('txn.businessId = :businessId', { businessId })
      .andWhere('txn.environment = :environment', { environment })
      .orderBy('txn.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.take);

    if (filters.status) {
      qb.andWhere('txn.executionStatus = :status', { status: filters.status });
    }
    if (filters.source) {
      qb.andWhere('txn.source = :source', { source: filters.source });
    }
    if (filters.collectionChannel) {
      qb.andWhere('txn.collectionChannel = :collectionChannel', {
        collectionChannel: filters.collectionChannel,
      });
    }
    if (filters.direction) {
      qb.andWhere('txn.direction = :direction', {
        direction: filters.direction,
      });
    }
    if (filters.reference?.trim()) {
      qb.andWhere(
        '(txn.reference ILIKE :reference OR txn.merchantReference ILIKE :reference OR txn.providerReference ILIKE :reference)',
        { reference: `%${filters.reference.trim()}%` },
      );
    }
    if (from) {
      qb.andWhere('txn.createdAt >= :from', { from });
    }
    if (to) {
      qb.andWhere("txn.createdAt < (:to::date + interval '1 day')", { to });
    }

    const [transactions, total] = await qb.getManyAndCount();

    return createOffsetPaginatedResponse(transactions, pagination, { total });
  }

  async getTransactionDetails(scope: RequestScope, transactionId: string) {
    const { businessId, environment } = getBusinessScope(scope);

    const transaction = await this.transactionRepo
      .createQueryBuilder('txn')
      .select([
        'txn.transactionId',
        'txn.walletId',
        'txn.expectedAmount',
        'txn.settledAmount',
        'txn.fee',
        'txn.source',
        'txn.collectionChannel',
        'txn.reference',
        'txn.merchantReference',
        'txn.providerReference',
        'txn.remark',
        'txn.sourceId',
        'txn.currency',
        'txn.provider',
        'txn.executionStatus',
        'txn.settlementStatus',
        'txn.riskStatus',
        'txn.direction',
        'txn.failureReason',
        'txn.environment',
        'txn.createdAt',
        'txn.updatedAt',
      ])
      .where('txn.transactionId = :transactionId', {
        transactionId: transactionId.trim(),
      })
      .andWhere('txn.businessId = :businessId', { businessId })
      .andWhere('txn.environment = :environment', { environment })
      .getOne();

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }
}
