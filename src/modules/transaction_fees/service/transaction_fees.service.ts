import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { TransactionFees } from '../entity/transaction_fees.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionFeeInput } from '../interface/txn_fees.interface';
import { toIntegerAmountString } from 'src/shared/utils';

@Injectable()
export class TransactionFeesService {
  private readonly logger = new Logger(TransactionFeesService.name);

  constructor(
    @InjectRepository(TransactionFees)
    private readonly txnRepo: Repository<TransactionFees>,
  ) {}

  async recordTransactionFee(
    input: TransactionFeeInput,
    entityManager?: EntityManager,
  ): Promise<TransactionFees> {
    try {
      const repository =
        entityManager?.getRepository(TransactionFees) ?? this.txnRepo;
      const transactionId = input.transactionId.trim();
      const businessId = input.businessId.trim();
      const provider = input.provider.trim();
      const feeSource = input.feeSource.trim();

      if (!transactionId || !businessId || !provider || !feeSource) {
        throw new BadRequestException(
          'Transaction id, business id, provider and fee source are required',
        );
      }

      const grossAmount = toIntegerAmountString(
        input.grossAmount,
        'grossAmount',
      );
      const chargedFee = toIntegerAmountString(input.chargedFee, 'chargedFee');
      const providerFee = toIntegerAmountString(
        input.providerFee,
        'providerFee',
      );
      const platformRevenue =
        input.platformRevenue === undefined
          ? (BigInt(chargedFee) - BigInt(providerFee)).toString()
          : toIntegerAmountString(input.platformRevenue, 'platformRevenue', {
              allowNegative: true,
            });

      const transactionFeePayload = {
        transactionId,
        businessId,
        provider,
        feeSource,
        grossAmount,
        chargedFee,
        providerFee,
        platformRevenue,
      };

      const existingTransactionFee = await repository.findOne({
        where: { transactionId, feeSource },
      });

      if (existingTransactionFee) {
        repository.merge(existingTransactionFee, transactionFeePayload);

        return repository.save(existingTransactionFee);
      }

      const transactionFee = repository.create(transactionFeePayload);

      return repository.save(transactionFee);
    } catch (error) {
      this.logger.error(
        `Failed to record transaction fee for transactionId=${input?.transactionId}, businessId=${input?.businessId}, provider=${input?.provider}, feeSource=${input?.feeSource}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
