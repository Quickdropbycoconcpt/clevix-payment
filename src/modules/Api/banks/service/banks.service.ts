import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Country } from 'src/modules/country-and-states/entity/country.entity';
import { ILike, In, IsNull, Not, Repository } from 'typeorm';
import { BankDefinition } from '../adapters/banks.adapter';
import { BanksAdapterFactory } from '../banks-adapter-factory';
import { Banks } from '../entity/banks.entity';
import { ProviderBank } from '../entity/provider-bank.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ValidateAccountDto } from '../dto/banks.dto';
import { ProviderService } from 'src/modules/Api/providers/service/providers.service';
import { ProviderServiceType } from 'src/shared/enum';

@Injectable()
export class BanksService {
  private readonly logger = new Logger(BanksService.name);

  constructor(
    private readonly banksAdapterFactory: BanksAdapterFactory,
    private readonly providerService: ProviderService,
    @InjectRepository(Banks)
    private readonly banksRepo: Repository<Banks>,
    @InjectRepository(ProviderBank)
    private readonly providerBankRepo: Repository<ProviderBank>,
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
  ) {}

  async getBanks(name?: string): Promise<BankDefinition[]> {
    const searchName = name?.trim();
    const provider = await this.getTransferProvider();
    const providerBanks = await this.providerBankRepo.find({
      where: {
        provider,
        bankId: Not(IsNull()),
        bank: {
          deletedAt: IsNull(),
          ...(searchName ? { name: ILike(`%${searchName}%`) } : {}),
        },
      },
      relations: { bank: true },
      order: { bank: { name: 'ASC' } },
    });

    return providerBanks.map((providerBank) => ({
      bankId: providerBank.bankId,
      name: providerBank.bank.name,
      bankCode: providerBank.bankCode,
    }));
  }

  async syncBanksFromProvider(providerValue?: string): Promise<{
    provider: string;
    total: number;
    linked: number;
    unlinked: number;
  }> {
    const provider =
      providerValue?.trim().toLowerCase() ?? (await this.getTransferProvider());
    const adapter = this.banksAdapterFactory.getBankAdapter(provider);
    const providerBanks = await adapter.getBanks();
    const country = await this.countryRepo.findOne({
      where: { countryCode: 'NG' },
    });

    if (!country) {
      throw new NotFoundException('Nigeria country record not found');
    }

    const providerBanksByCode = new Map<string, BankDefinition>();
    providerBanks.forEach((bank) => {
      const name = bank.name?.trim();
      const bankCode = bank.bankCode?.trim();

      if (name && bankCode) {
        providerBanksByCode.set(bankCode, { name, bankCode });
      }
    });

    const counts = { linked: 0, unlinked: 0 };

    await this.banksRepo.manager.transaction(async (manager) => {
      const banksRepo = manager.getRepository(Banks);
      const providerBankRepo = manager.getRepository(ProviderBank);
      const isBootstrap = (await banksRepo.count({ withDeleted: true })) === 0;

      const ownRows = await providerBankRepo.find({
        where: { provider },
        withDeleted: true,
      });
      const ownRowsByCode = new Map(ownRows.map((row) => [row.bankCode, row]));

      const otherLinkedRows = await providerBankRepo.find({
        where: { provider: Not(provider), bankId: Not(IsNull()) },
      });
      const bankIdsByCode = new Map<string, Set<string>>();
      otherLinkedRows.forEach((row) => {
        const bankIds = bankIdsByCode.get(row.bankCode) ?? new Set<string>();
        bankIds.add(row.bankId);
        bankIdsByCode.set(row.bankCode, bankIds);
      });

      const createdBankIdsByCode = new Map<string, string>();

      if (isBootstrap) {
        const createdBanks = await banksRepo.save(
          Array.from(providerBanksByCode.values()).map((bank) =>
            banksRepo.create({
              name: bank.name,
              bankCode: bank.bankCode,
              provider,
              countryId: country.countryId,
            }),
          ),
        );
        createdBanks.forEach((bank) =>
          createdBankIdsByCode.set(bank.bankCode, bank.bankId),
        );
      }

      const rows: ProviderBank[] = [];

      for (const bank of providerBanksByCode.values()) {
        const row =
          ownRowsByCode.get(bank.bankCode) ??
          providerBankRepo.create({ provider, bankCode: bank.bankCode });

        row.name = bank.name;
        row.deletedAt = null;

        if (!row.bankId) {
          row.bankId = isBootstrap
            ? createdBankIdsByCode.get(bank.bankCode)
            : this.resolveBankIdByCode(bankIdsByCode, bank.bankCode, provider);
        }

        if (row.bankId) {
          counts.linked += 1;
        } else {
          counts.unlinked += 1;
        }

        rows.push(row);
      }

      await providerBankRepo.save(rows);
    });

    this.logger.log(
      `Synced ${providerBanksByCode.size} banks from ${provider}: linked=${counts.linked} unlinked=${counts.unlinked}`,
    );

    return { provider, total: providerBanksByCode.size, ...counts };
  }

  private resolveBankIdByCode(
    bankIdsByCode: Map<string, Set<string>>,
    bankCode: string,
    provider: string,
  ): string | null {
    const bankIds = bankIdsByCode.get(bankCode);

    if (!bankIds) {
      return null;
    }

    if (bankIds.size > 1) {
      this.logger.warn(
        `Bank code ${bankCode} from ${provider} matches ${bankIds.size} different banks; left unlinked`,
      );
      return null;
    }

    return bankIds.values().next().value;
  }

  async validateBankAccount(body: ValidateAccountDto) {
    const adapter = this.banksAdapterFactory.getBankAdapter(
      await this.getTransferProvider(),
    );
    try {
      return await adapter.validateAccountNumber(
        body.accountNumber,
        body.bankCode,
      );
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(
        `We can't complete the request at the moment`,
      );
    }
  }

  async getProviderBankCode(
    bankId: string,
    provider: string,
  ): Promise<string | null> {
    const providerBank = await this.providerBankRepo.findOne({
      where: { bankId, provider },
    });

    return providerBank?.bankCode ?? null;
  }

  async getBanksInId(ids: string[]) {
    return await this.banksRepo.find({
      where: {
        bankId: In(ids),
      },
    });
  }

  private async getTransferProvider(): Promise<string> {
    const provider = await this.providerService.getActiveProviderForService(
      ProviderServiceType.TRANSFER,
    );

    return provider.value;
  }
}
