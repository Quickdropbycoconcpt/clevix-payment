import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BasicStatus, TaxCollectionMode, TaxPayer } from 'src/shared/enum';
import { toDecimalRatio } from 'src/shared/utils';
import { EntityManager, Repository } from 'typeorm';
import type { RequestScope } from 'src/shared/business-scope';
import { getBusinessScope } from 'src/shared/business-scope';
import {
  CreateTaxConfigurationDto,
  CreateTaxSettlementDestinationDto,
  TaxConfigurationQueryDto,
  TaxTransactionQueryDto,
  UpdateTaxConfigurationDto,
  UpdateTaxSettlementDestinationDto,
} from '../dto/tax-configuration.dto';
import { TaxConfiguration } from '../entity/tax-config.entity';
import {
  TaxSettlementDestination,
  TaxSettlementDestinationType,
} from '../entity/tax-settlement-destination.entity';
import {
  TaxTransaction,
  TaxTransactionStatus,
} from '../entity/tax-transaction.entity';

export type CreateTaxTransactionInput = {
  businessId: string;
  environment: string;
  invoiceId: string;
  invoiceItemId: string;
  itemId: string;
  taxId: string;
  baseAmount: string;
  taxAmount: string;
};

@Injectable()
export class TaxManagementService {
  constructor(
    @InjectRepository(TaxConfiguration)
    private readonly taxConfigRepo: Repository<TaxConfiguration>,
    @InjectRepository(TaxSettlementDestination)
    private readonly taxDestinationRepo: Repository<TaxSettlementDestination>,
    @InjectRepository(TaxTransaction)
    private readonly taxTransactionRepo: Repository<TaxTransaction>,
  ) {}

  calculateTaxAmount(baseAmount: string, rate: number | string): bigint {
    const ratio = toDecimalRatio(rate, 'tax rate');

    return (BigInt(baseAmount) * ratio.numerator) / (ratio.denominator * 100n);
  }

  async createTaxConfiguration(input: CreateTaxConfigurationDto) {
    const taxConfiguration = this.taxConfigRepo.create({
      name: input.name.trim(),
      rate: input.rate,
      collectionMode: input.collectionMode,
      payer: input.payer,
      countryId: input.countryId,
      stateId: input.stateId ?? null,
      lgId: input.lgId ?? null,
      status: input.status ?? BasicStatus.ACTIVE,
    });

    return this.taxConfigRepo.save(taxConfiguration);
  }

  async getTaxConfigurations(query: TaxConfigurationQueryDto) {
    const builder = this.taxConfigRepo
      .createQueryBuilder('tax')
      .leftJoinAndSelect('tax.country', 'country')
      .leftJoinAndSelect('tax.state', 'state')
      .leftJoinAndSelect('tax.localGovernment', 'localGovernment')
      .orderBy('tax.name', 'ASC');
    const name = query.name?.trim();

    if (name) {
      builder.andWhere('tax.name ILIKE :name', { name: `%${name}%` });
    }

    if (query.countryId) {
      builder.andWhere('tax.countryId = :countryId', {
        countryId: query.countryId,
      });
    }

    if (query.stateId) {
      builder.andWhere('tax.stateId = :stateId', { stateId: query.stateId });
    }

    if (query.lgId) {
      builder.andWhere('tax.lgId = :lgId', { lgId: query.lgId });
    }

    if (query.collectionMode) {
      builder.andWhere('tax.collectionMode = :collectionMode', {
        collectionMode: query.collectionMode,
      });
    }

    if (query.status) {
      builder.andWhere('tax.status = :status', { status: query.status });
    }

    return builder.getMany();
  }

  async getTaxConfiguration(taxId: string) {
    const taxConfiguration = await this.taxConfigRepo.findOne({
      where: { taxId },
      relations: {
        country: true,
        state: true,
        localGovernment: true,
      },
    });

    if (!taxConfiguration) {
      throw new NotFoundException('Tax configuration not found');
    }

    return taxConfiguration;
  }

  async updateTaxConfiguration(
    taxId: string,
    input: UpdateTaxConfigurationDto,
  ) {
    await this.getTaxConfiguration(taxId);
    const updateInput: Partial<TaxConfiguration> = {};

    if (input.name !== undefined) {
      updateInput.name = input.name.trim();
    }

    if (input.rate !== undefined) {
      updateInput.rate = input.rate;
    }

    if (input.collectionMode !== undefined) {
      updateInput.collectionMode = input.collectionMode;
    }

    if (input.payer !== undefined) {
      updateInput.payer = input.payer;
    }

    if (input.countryId !== undefined) {
      updateInput.countryId = input.countryId;
    }

    if (input.stateId !== undefined) {
      updateInput.stateId = input.stateId ?? null;
    }

    if (input.lgId !== undefined) {
      updateInput.lgId = input.lgId ?? null;
    }

    if (input.status !== undefined) {
      updateInput.status = input.status;
    }

    await this.taxConfigRepo.update({ taxId }, updateInput);

    return this.getTaxConfiguration(taxId);
  }

  async addTaxSettlementDestination(
    taxId: string,
    input: CreateTaxSettlementDestinationDto,
  ) {
    await this.getTaxConfiguration(taxId);
    this.validateSettlementDestination(input);

    const destination = this.taxDestinationRepo.create({
      taxId,
      destinationType: input.destinationType,
      settlementBankAccountId: input.settlementBankAccountId ?? null,
      walletId: input.walletId ?? null,
      providerRevenueCode: input.providerRevenueCode?.trim() || null,
      governmentAgencyCode: input.governmentAgencyCode?.trim() || null,
      status: input.status ?? BasicStatus.ACTIVE,
      metadata: input.metadata ?? null,
    });

    return this.taxDestinationRepo.save(destination);
  }

  async getTaxSettlementDestinations(taxId: string) {
    await this.getTaxConfiguration(taxId);

    return this.taxDestinationRepo.find({
      where: { taxId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateTaxSettlementDestination(
    taxId: string,
    taxSettlementDestinationId: string,
    input: UpdateTaxSettlementDestinationDto,
  ) {
    const destination = await this.taxDestinationRepo.findOne({
      where: { taxId, taxSettlementDestinationId },
    });

    if (!destination) {
      throw new NotFoundException('Tax settlement destination not found');
    }

    const updateInput = {
      destinationType: input.destinationType ?? destination.destinationType,
      settlementBankAccountId:
        input.settlementBankAccountId ?? destination.settlementBankAccountId,
      walletId: input.walletId ?? destination.walletId,
      providerRevenueCode:
        input.providerRevenueCode !== undefined
          ? input.providerRevenueCode?.trim() || null
          : destination.providerRevenueCode,
      governmentAgencyCode:
        input.governmentAgencyCode !== undefined
          ? input.governmentAgencyCode?.trim() || null
          : destination.governmentAgencyCode,
      status: input.status ?? destination.status,
      metadata: input.metadata ?? destination.metadata,
    };

    this.validateSettlementDestination(updateInput);

    await this.taxDestinationRepo.update(
      { taxSettlementDestinationId },
      updateInput,
    );

    return this.taxDestinationRepo.findOne({
      where: { taxSettlementDestinationId },
    });
  }

  async getBusinessTaxTransactions(
    scope: RequestScope,
    query: TaxTransactionQueryDto,
  ) {
    const businessScope = getBusinessScope(scope);
    const builder = this.taxTransactionRepo
      .createQueryBuilder('taxTransaction')
      .leftJoinAndSelect('taxTransaction.tax', 'tax')
      .leftJoinAndSelect(
        'taxTransaction.taxSettlementDestination',
        'taxSettlementDestination',
      )
      .leftJoinAndSelect(
        'taxTransaction.settlementBankAccount',
        'settlementBankAccount',
      )
      .leftJoinAndSelect('taxTransaction.wallet', 'wallet')
      .where('taxTransaction.businessId = :businessId', {
        businessId: businessScope.businessId,
      })
      .andWhere('taxTransaction.environment = :environment', {
        environment: businessScope.environment,
      })
      .orderBy('taxTransaction.createdAt', 'DESC');

    if (query.status) {
      builder.andWhere('taxTransaction.status = :status', {
        status: query.status,
      });
    }

    if (query.taxId) {
      builder.andWhere('taxTransaction.taxId = :taxId', {
        taxId: query.taxId,
      });
    }

    if (query.invoiceId) {
      builder.andWhere('taxTransaction.invoiceId = :invoiceId', {
        invoiceId: query.invoiceId,
      });
    }

    if (query.transactionId) {
      builder.andWhere('taxTransaction.transactionId = :transactionId', {
        transactionId: query.transactionId,
      });
    }

    if (query.from) {
      builder.andWhere('taxTransaction.createdAt >= :from', {
        from: new Date(query.from),
      });
    }

    if (query.to) {
      builder.andWhere('taxTransaction.createdAt <= :to', {
        to: new Date(query.to),
      });
    }

    return builder.getMany();
  }

  async getBusinessTaxTransaction(
    scope: RequestScope,
    taxTransactionId: string,
  ) {
    const businessScope = getBusinessScope(scope);
    const taxTransaction = await this.taxTransactionRepo.findOne({
      where: {
        taxTransactionId,
        businessId: businessScope.businessId,
        environment: businessScope.environment,
      },
      relations: {
        tax: true,
        taxSettlementDestination: true,
        settlementBankAccount: true,
        wallet: true,
      },
    });

    if (!taxTransaction) {
      throw new NotFoundException('Tax transaction not found');
    }

    return taxTransaction;
  }

  async getActiveTaxConfigurations(taxIds: string[]) {
    if (!taxIds.length) {
      return new Map<string, TaxConfiguration>();
    }

    const configs = await this.taxConfigRepo
      .createQueryBuilder('tax')
      .where('tax.taxId IN (:...taxIds)', { taxIds })
      .andWhere('tax.status = :status', { status: BasicStatus.ACTIVE })
      .getMany();

    return new Map(configs.map((config) => [config.taxId, config]));
  }

  private validateSettlementDestination(input: {
    destinationType: TaxSettlementDestinationType;
    settlementBankAccountId?: string | null;
    walletId?: string | null;
  }) {
    if (
      input.destinationType === TaxSettlementDestinationType.BANK_ACCOUNT &&
      !input.settlementBankAccountId
    ) {
      throw new BadRequestException('Settlement bank account is required');
    }

    if (
      input.destinationType === TaxSettlementDestinationType.WALLET &&
      !input.walletId
    ) {
      throw new BadRequestException('Wallet is required');
    }
  }

  async createAssessedTaxTransactions(
    inputs: CreateTaxTransactionInput[],
    entityManager?: EntityManager,
  ) {
    if (!inputs.length) {
      return [];
    }

    const destinationRepo =
      entityManager?.getRepository(TaxSettlementDestination) ??
      this.taxDestinationRepo;
    const transactionRepo =
      entityManager?.getRepository(TaxTransaction) ?? this.taxTransactionRepo;
    const configRepo =
      entityManager?.getRepository(TaxConfiguration) ?? this.taxConfigRepo;

    const configs = await configRepo
      .createQueryBuilder('tax')
      .where('tax.taxId IN (:...taxIds)', {
        taxIds: [...new Set(inputs.map((input) => input.taxId))],
      })
      .getMany();
    const configById = new Map(configs.map((config) => [config.taxId, config]));
    const taxTransactions: TaxTransaction[] = [];

    for (const input of inputs) {
      const config = configById.get(input.taxId);

      if (!config) {
        continue;
      }

      const destination =
        config.collectionMode === TaxCollectionMode.MERCHANT_REMITTED
          ? null
          : await destinationRepo.findOne({
              where: { taxId: input.taxId, status: BasicStatus.ACTIVE },
              order: { createdAt: 'DESC' },
            });

      taxTransactions.push(
        transactionRepo.create({
          businessId: input.businessId,
          environment: input.environment,
          invoiceId: input.invoiceId,
          invoiceItemId: input.invoiceItemId,
          itemId: input.itemId,
          taxId: input.taxId,
          baseAmount: input.baseAmount,
          taxAmount: input.taxAmount,
          rate: config.rate,
          collectionMode: config.collectionMode,
          payer: config.payer ?? TaxPayer.CUSTOMER,
          taxSettlementDestinationId:
            destination?.taxSettlementDestinationId ?? null,
          destinationType: destination?.destinationType ?? null,
          settlementBankAccountId: destination?.settlementBankAccountId ?? null,
          walletId: destination?.walletId ?? null,
          providerRevenueCode: destination?.providerRevenueCode ?? null,
          governmentAgencyCode: destination?.governmentAgencyCode ?? null,
          status: TaxTransactionStatus.ASSESSED,
          metadata: destination?.metadata ?? null,
        }),
      );
    }

    return transactionRepo.save(taxTransactions);
  }

  async markInvoiceTaxesCollected(
    invoiceId: string,
    transactionId: string,
    entityManager?: EntityManager,
  ) {
    const repo =
      entityManager?.getRepository(TaxTransaction) ?? this.taxTransactionRepo;

    return repo.update(
      { invoiceId, status: TaxTransactionStatus.ASSESSED },
      {
        transactionId,
        status: TaxTransactionStatus.COLLECTED,
        collectedAt: new Date(),
      },
    );
  }
}
