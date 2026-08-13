import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Transactions } from '../entity/transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { RequestScope } from 'src/shared/business-scope';
import { createOffsetPaginatedResponse } from 'src/shared/http/pagination';

@Injectable()
export class TransactionsServiceListing {
  constructor(
    @InjectRepository(Transactions)
    private readonly transactionRepo: Repository<Transactions>,
  ) {}

  async listTransactions(scope: RequestScope) {
    const qb = this.transactionRepo
      .createQueryBuilder('txn')
      .select([
        'txn.expectedAmount',
        'txn.settledAmount',
        'txn.createdAt',
        'txn.executionStatus',
        'txn.source',
        'txn.collectionChannel',
        'txn.settlementStatus',
        'txn.merchantReference',
        'txn.currency',
      ]);
    qb.orderBy('txn.createdAt', 'DESC');
    const [transactions, total] = await qb.getManyAndCount();
    return createOffsetPaginatedResponse(transactions, scope.pagination, {
      total,
    });
  }
}
