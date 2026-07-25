import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SettlementInput } from '../interface/settlement.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettlementBankAccounts } from '../entity/settlement_accounts.entity';
import { getBusinessScope, RequestScope } from 'src/shared/business-scope';

@Injectable()
export class SettlementService {
  constructor(
    @InjectRepository(SettlementBankAccounts)
    private readonly settlementAccountRepo: Repository<SettlementBankAccounts>,
  ) {}

  async addSettlementBankAccount(input: SettlementInput, scope: RequestScope) {
    const { businessId, environment } = getBusinessScope(scope);

    try {
      /**
       * TODO: validate the providerbankId to ensure it matches
       * what we have....
       */
      const existing = await this.settlementAccountRepo.findOne({
        where: {
          accountNumber: input.accountNumber.trim(),
          businessId,
          environment,
        },
        withDeleted: true,
      });
      if (existing) {
        if (existing.deletedAt) {
          await this.settlementAccountRepo.restore({
            bankAccountId: existing.bankAccountId,
          });
          existing.deletedAt = null;
        }
        return existing;
      }
      const acct = this.settlementAccountRepo.create({
        accountName: input.accountName?.trim(),
        accountNumber: input.accountNumber?.trim(),
        providerbankId: input.providerbankId?.trim(),
        businessId,
        environment,
      });
      const saved = await this.settlementAccountRepo.save(acct);
      return saved;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async removeSettlementAccount(settlementAccountId: string) {
    const existing = await this.settlementAccountRepo.findOne({
      where: { bankAccountId: settlementAccountId },
    });

    if (!existing) {
      throw new NotFoundException('Settlement account not found');
    }

    await this.settlementAccountRepo.softDelete({
      bankAccountId: settlementAccountId,
    });

    return { removed: true };
  }

  async getSettlementAccounts(scope: RequestScope, name?: string) {
    const { businessId, environment } = getBusinessScope(scope);

    const query = this.settlementAccountRepo
      .createQueryBuilder('settlementAccount')
      .where('settlementAccount.businessId = :businessId', {
        businessId,
      })
      .andWhere('settlementAccount.environment = :environment', {
        environment,
      });

    if (name) {
      query.andWhere('settlementAccount.accountName ILIKE :accountName', {
        accountName: `%${name}%`,
      });
    }

    const accounts = await query.getMany();
    return { accounts };
  }
}
