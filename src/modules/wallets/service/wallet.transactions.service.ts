import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { WalletTransactions } from '../entity/wallet_transactions.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { getBusinessScope, RequestScope } from 'src/shared/business-scope';
import { createOffsetPaginatedResponse } from 'src/shared/http/pagination';
import { Wallets } from '../entity/wallet.entity';
import { WalletTransactionQueryDto } from '../dto/wallets.dto';

@Injectable()
export class WalletTransactionsService {
  constructor(
    @InjectRepository(WalletTransactions)
    private readonly transactions: Repository<WalletTransactions>,
    @InjectRepository(Wallets)
    private readonly wallets: Repository<Wallets>,
  ) {}

  async getTransactions(scope: RequestScope, query: WalletTransactionQueryDto) {
    const { businessId, environment, pagination } = getBusinessScope(scope);

    const qb = this.transactions
      .createQueryBuilder('transaction')
      .select([
        'transaction.availableBalanceAfter',
        'transaction.availableBalanceBefore',
        'transaction.narration',
        'transaction.transactionType',
        'transaction.reference',
        'transaction.amount',
        'transaction.status',
        'transaction.currency',
        'transaction.createdAt',
      ])
      .where('transaction.businessId = :businessId', { businessId })
      .andWhere('transaction.environment = :environment', { environment });

    // if (query.fromDate) {
    //   qb.andWhere('transaction.createdAt >= :fromDate', {
    //     fromDate: query.fromDate,
    //   });
    // }

    // if (query.toDate) {
    //   qb.andWhere('transaction.createdAt <= :toDate', {
    //     toDate: query.toDate,
    //   });
    // }

    if (query.type) {
      qb.andWhere('transaction.transactionType = :transactionType', {
        transactionType: query.type,
      });
    }

    qb.orderBy('transaction.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.take);

    const [transactions, total] = await qb.getManyAndCount();

    return createOffsetPaginatedResponse(transactions, pagination, {
      total,
    });
  }

  async getWallets(scope: RequestScope) {
    const { businessId, environment } = getBusinessScope(scope);

    return this.wallets.find({
      where: {
        businessId,
        environment,
      },
      select: {
        currency: true,
        balance: true,
      },
      order: {
        currency: 'ASC',
        createdAt: 'DESC',
      },
    });
  }
}
