import { Injectable, NotFoundException } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { Transactions } from '../entity/transaction.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { getBusinessScope, RequestScope } from 'src/shared/business-scope';
import { createOffsetPaginatedResponse } from 'src/shared/http/pagination';
import { parseDateRange } from 'src/shared/http/date-range';
import { ListTransactionsQueryDto } from '../dto/list-transactions-query.dto';
import { InvoicePaymentTransaction } from '../../service-checkout-invoice/entity/invoice_transaction.entity';
import { TransactionSource } from 'src/shared/enum';

@Injectable()
export class TransactionsServiceListing {
  constructor(
    @InjectRepository(Transactions)
    private readonly transactionRepo: Repository<Transactions>,
    @InjectRepository(InvoicePaymentTransaction)
    private readonly invoiceTransactionRepo: Repository<InvoicePaymentTransaction>,
  ) {}

  private async getInvoicesByTransactionReference(
    businessId: string,
    environment: string,
    references: string[],
  ) {
    if (references.length === 0) {
      return new Map<string, InvoicePaymentTransaction['invoice']>();
    }

    const attempts = await this.invoiceTransactionRepo.find({
      where: {
        invoiceTransactionReference: In(references),
        businessId,
        environment,
      },
      relations: { invoice: true },
    });

    return new Map(
      attempts
        .filter((attempt) => attempt.invoice)
        .map((attempt) => [
          attempt.invoiceTransactionReference,
          attempt.invoice,
        ]),
    );
  }

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

    const invoiceTransactionReferences = transactions
      .filter((txn) => txn.source === TransactionSource.CHECKOUT_INVOICE)
      .map((txn) => txn.merchantReference);

    const invoicesByReference = await this.getInvoicesByTransactionReference(
      businessId,
      environment,
      invoiceTransactionReferences,
    );

    const transactionsWithInvoice = transactions.map((txn) => ({
      ...txn,
      invoice: invoicesByReference.get(txn.merchantReference) ?? null,
    }));

    return createOffsetPaginatedResponse(transactionsWithInvoice, pagination, {
      total,
    });
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

    let invoice: InvoicePaymentTransaction['invoice'] | null = null;
    if (transaction.source === TransactionSource.CHECKOUT_INVOICE) {
      const invoicesByReference = await this.getInvoicesByTransactionReference(
        businessId,
        environment,
        [transaction.reference],
      );
      invoice = invoicesByReference.get(transaction.reference) ?? null;
    }

    return { ...transaction, invoice };
  }
}
