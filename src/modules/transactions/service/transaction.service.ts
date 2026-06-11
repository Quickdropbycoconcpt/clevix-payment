import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LedgerEntryDirection,
  TransactionRiskStatus,
  TransactionSettlementStatus,
  TransactionSource,
  TransactionStatus,
} from 'src/shared/enum';
import { IntegerAmount, toIntegerAmountString } from 'src/shared/utils';
import { Brackets, EntityManager, Repository } from 'typeorm';
import { Transactions } from '../entity/transaction.entity';

type TransactionAmount = IntegerAmount;

export type CreateTransactionInput = {
  businessId: string;
  environment: string;
  expectedAmount: TransactionAmount;
  settledAmount?: TransactionAmount;
  fee?: TransactionAmount;
  source: TransactionSource;
  reference: string;
  remark?: string;
  sourceId?: string | null;
  currency: string;
  provider: string;
  executionStatus?: TransactionStatus;
  merchantReference?: string | null;
  providerReference?: string | null;
  settlementStatus?: TransactionSettlementStatus | null;
  riskStatus?: TransactionRiskStatus | null;
  direction: LedgerEntryDirection;
  failureReason?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type UpdateTransactionInput = Partial<
  Pick<
    CreateTransactionInput,
    | 'expectedAmount'
    | 'settledAmount'
    | 'fee'
    | 'source'
    | 'remark'
    | 'sourceId'
    | 'currency'
    | 'provider'
    | 'executionStatus'
    | 'merchantReference'
    | 'providerReference'
    | 'settlementStatus'
    | 'riskStatus'
    | 'direction'
    | 'failureReason'
    | 'idempotencyKey'
    | 'metadata'
  >
>;

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transactions)
    private readonly transactionRepo: Repository<Transactions>,
  ) {}

  async createTransaction(
    input: CreateTransactionInput,
    entityManager?: EntityManager,
  ): Promise<Transactions> {
    const repository =
      entityManager?.getRepository(Transactions) ?? this.transactionRepo;
    const reference = input.reference.trim();
    const idempotencyKey = input.idempotencyKey?.trim() || null;

    if (!reference) {
      throw new BadRequestException('Transaction reference is required');
    }

    if (idempotencyKey) {
      const existingTransaction = await repository.findOne({
        where: { idempotencyKey },
      });

      if (existingTransaction) {
        return existingTransaction;
      }
    }

    const existingReference = await repository.findOne({
      where: { reference },
    });

    if (existingReference) {
      throw new ConflictException('Transaction reference already exists');
    }

    const expectedAmount = toIntegerAmountString(
      input.expectedAmount,
      'expectedAmount',
    );
    const transaction = repository.create({
      businessId: input.businessId,
      environment: input.environment,
      expectedAmount,
      settledAmount: toIntegerAmountString(
        input.settledAmount ?? input.expectedAmount,
        'settledAmount',
      ),
      fee: toIntegerAmountString(input.fee ?? 0, 'fee'),
      source: input.source,
      reference,
      remark: input.remark ?? '',
      sourceId: input.sourceId ?? null,
      currency: input.currency.trim().toUpperCase(),
      provider: input.provider.trim(),
      executionStatus: input.executionStatus ?? TransactionStatus.INITIATED,
      merchantReference: input.merchantReference ?? null,
      providerReference: input.providerReference ?? null,
      settlementStatus:
        input.settlementStatus ?? TransactionSettlementStatus.UNSETTLED,
      riskStatus: input.riskStatus ?? TransactionRiskStatus.CLEAR,
      direction: input.direction,
      failureReason: input.failureReason ?? null,
      idempotencyKey,
      metadata: input.metadata ?? null,
    });

    try {
      return await repository.save(transaction);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        if (idempotencyKey) {
          const existingTransaction = await repository.findOne({
            where: { idempotencyKey },
          });

          if (existingTransaction) {
            return existingTransaction;
          }
        }

        throw new ConflictException(
          'Transaction reference or idempotency key already exists',
        );
      }

      throw error;
    }
  }

  async updateTransactionBySystemReference(
    reference: string,
    input: UpdateTransactionInput,
    entityManager?: EntityManager,
  ): Promise<Transactions> {
    const repository =
      entityManager?.getRepository(Transactions) ?? this.transactionRepo;
    const transaction = await repository.findOne({
      where: { reference },
    });

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    repository.merge(transaction, this.getTransactionUpdatePayload(input));

    try {
      return await repository.save(transaction);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          'Transaction reference or idempotency key already exists',
        );
      }

      throw error;
    }
  }

  async getTransactionByMerchantRef(
    merchantReference: string,
    entityManager?: EntityManager,
  ) {
    const repository =
      entityManager?.getRepository(Transactions) ?? this.transactionRepo;

    return await repository.findOne({
      where: {
        merchantReference,
      },
    });
  }

  async getSuccessfulTransaction(reference: string) {
    return this.transactionRepo
      .createQueryBuilder('txn')
      .where(
        new Brackets((qb) => {
          qb.where('txn.reference = :reference', { reference })
            .orWhere('txn.merchantReference = :reference', { reference })
            .orWhere('txn.providerReference = :reference', { reference });
        }),
      )
      .andWhere('txn.executionStatus = :status', {
        status: TransactionStatus.SUCCESS,
      })
      .getOne();
  }

  async getTransactionBySystemReference(
    reference: string,
    entityManager?: EntityManager,
  ) {
    const repository =
      entityManager?.getRepository(Transactions) ?? this.transactionRepo;

    return await repository.findOne({ where: { reference } });
  }

  private getTransactionUpdatePayload(
    input: UpdateTransactionInput,
  ): Partial<Transactions> {
    const payload: Partial<Transactions> = {};

    if (input.expectedAmount !== undefined) {
      payload.expectedAmount = toIntegerAmountString(
        input.expectedAmount,
        'expectedAmount',
      );
    }

    if (input.settledAmount !== undefined) {
      payload.settledAmount = toIntegerAmountString(
        input.settledAmount,
        'settledAmount',
      );
    }

    if (input.fee !== undefined) {
      payload.fee = toIntegerAmountString(input.fee, 'fee');
    }

    if (input.source !== undefined) {
      payload.source = input.source;
    }

    if (input.remark !== undefined) {
      payload.remark = input.remark;
    }

    if (input.sourceId !== undefined) {
      payload.sourceId = input.sourceId;
    }

    if (input.currency !== undefined) {
      payload.currency = input.currency.trim().toUpperCase();
    }

    if (input.provider !== undefined) {
      payload.provider = input.provider.trim();
    }

    if (input.executionStatus !== undefined) {
      payload.executionStatus = input.executionStatus;
    }

    if (input.merchantReference !== undefined) {
      payload.merchantReference = input.merchantReference;
    }

    if (input.providerReference !== undefined) {
      payload.providerReference = input.providerReference;
    }

    if (input.settlementStatus !== undefined) {
      payload.settlementStatus = input.settlementStatus;
    }

    if (input.riskStatus !== undefined) {
      payload.riskStatus = input.riskStatus;
    }

    if (input.direction !== undefined) {
      payload.direction = input.direction;
    }

    if (input.failureReason !== undefined) {
      payload.failureReason = input.failureReason;
    }

    if (input.idempotencyKey !== undefined) {
      payload.idempotencyKey = input.idempotencyKey?.trim() || null;
    }

    if (input.metadata !== undefined) {
      payload.metadata = input.metadata;
    }

    return payload;
  }

  async getInitiatedOrProcessingTransferTxn(input: { batchSize: number }) {
    return this.transactionRepo
      .createQueryBuilder('txn')
      .where(
        new Brackets((qb) => {
          qb.where('txn.executionStatus = :processing', {
            processing: TransactionStatus.PROCESSING,
          });
        }),
      )
      .andWhere('txn.source = :source', {
        source: TransactionSource.TRANSFER,
      })
      .orderBy('txn.createdAt', 'ASC')
      .take(input.batchSize)
      .getMany();
  }

  private isUniqueViolation(error: unknown): boolean {
    const databaseError = error as {
      code?: string;
      driverError?: { code?: string };
    };

    return (
      databaseError.code === '23505' ||
      databaseError.driverError?.code === '23505'
    );
  }
}
