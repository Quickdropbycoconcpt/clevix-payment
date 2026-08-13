import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Country } from 'src/modules/country-and-states/entity/country.entity';
import { ILike, In, Repository } from 'typeorm';
import { BankDefinition, BankProvider } from '../adapters/banks.adapter';
import { BanksAdapterFactory } from '../banks-adapter-factory';
import { Banks } from '../entity/banks.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ValidateAccountDto } from '../dto/banks.dto';

@Injectable()
export class BanksService {
  private readonly logger = new Logger(BanksService.name);

  constructor(
    private readonly banksAdapterFactory: BanksAdapterFactory,
    @InjectRepository(Banks)
    private readonly banksRepo: Repository<Banks>,
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
  ) {}

  async getBanks(name?: string): Promise<BankDefinition[]> {
    const searchName = name?.trim();
    const banks = await this.banksRepo.find({
      where: searchName ? { name: ILike(`%${searchName}%`) } : undefined,
      order: { name: 'ASC' },
    });

    return banks.map((bank) => ({
      bankId: bank.bankId,
      name: bank.name,
      bankCode: bank.bankCode,
    }));
  }

  // @Cron(CronExpression.EVERY_HOUR)
  async syncBanksFromProvider(): Promise<void> {
    const adapter = this.banksAdapterFactory.getBankAdapter(BankProvider.VFD);
    const providerBanks = await adapter.getBanks();
    const country = await this.countryRepo.findOne({
      where: { countryCode: 'NG' },
    });

    if (!country) {
      throw new NotFoundException('Nigeria country record not found');
    }

    const existingBanks = await this.banksRepo.find({
      where: { countryId: country.countryId },
      withDeleted: true,
    });
    const banksByCode = new Map(
      existingBanks.map((bank) => [bank.bankCode, bank]),
    );

    const providerBanksByCode = new Map<string, BankDefinition>();
    providerBanks.forEach((bank) => {
      const name = bank.name?.trim();
      const bankCode = bank.bankCode?.trim();

      if (name && bankCode) {
        providerBanksByCode.set(bankCode, { name, bankCode });
      }
    });

    const banks = Array.from(providerBanksByCode.values()).map((bank) => {
      const existingBank = banksByCode.get(bank.bankCode);

      return this.banksRepo.create({
        ...existingBank,
        name: bank.name,
        bankCode: bank.bankCode,
        countryId: country.countryId,
        deletedAt: null,
      });
    });

    await this.banksRepo.save(banks);

    this.logger.log(`Synced ${banks.length} banks from ${BankProvider.VFD}`);
  }

  async validateBankAccount(body: ValidateAccountDto) {
    const adapter = this.banksAdapterFactory.getBankAdapter(BankProvider.VFD);
    try {
      await adapter.validateAccountNumber(body.accountNumber, body.bankCode);
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(
        `We can't complete the request at the moment`,
      );
    }
  }

  async getBanksInId(ids: string[]) {
    return await this.banksRepo.find({
      where: {
        bankId: In(ids),
      },
    });
  }
}
