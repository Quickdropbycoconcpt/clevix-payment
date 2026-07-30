import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { IncomingPaymentSource } from 'src/shared/enum';
import {
  SettlementTransactions,
  SettlementTransactionStatus,
} from '../entity/settlement_transactions.entity';
import { BusinessSettlementType } from '../entity/business_settlement_config.entity';

type UpsertUnsettledBucketInput = {
  businessId: string;
  environment: string;
  paymentSource: IncomingPaymentSource;
  settlementType: BusinessSettlementType;
  settlementBankAccountId: string | null;
  amount: bigint;
};

@Injectable()
export class SettlementTransactionsService {
  constructor(
    @InjectRepository(SettlementTransactions)
    private readonly settlementTxnRepo: Repository<SettlementTransactions>,
  ) {}

  async upsertUnsettledBucket(
    input: UpsertUnsettledBucketInput,
    entityManager?: EntityManager,
  ) {
    const repo =
      entityManager?.getRepository(SettlementTransactions) ??
      this.settlementTxnRepo;

    const settlementDate = new Date().toISOString().slice(0, 10);

    const existing = await repo.findOne({
      where: {
        businessId: input.businessId,
        environment: input.environment,
        paymentSource: input.paymentSource,
        settlementType: input.settlementType,
        settlementbankAccountId: input.settlementBankAccountId ?? IsNull(),
        status: SettlementTransactionStatus.UNSETTLED,
        settlementDate,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (existing) {
      existing.expectedSettledAmount = (
        BigInt(existing.expectedSettledAmount) + input.amount
      ).toString();

      return repo.save(existing);
    }

    const bucket = repo.create({
      businessId: input.businessId,
      environment: input.environment,
      paymentSource: input.paymentSource,
      settlementType: input.settlementType,
      settlementbankAccountId: input.settlementBankAccountId,
      expectedSettledAmount: input.amount.toString(),
      settlementDate,
    });

    return repo.save(bucket);
  }
}
