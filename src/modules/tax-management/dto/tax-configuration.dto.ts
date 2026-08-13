import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { BasicStatus, TaxCollectionMode, TaxPayer } from 'src/shared/enum';
import { TaxSettlementDestinationType } from '../entity/tax-settlement-destination.entity';
import { TaxTransactionStatus } from '../entity/tax-transaction.entity';

export class CreateTaxConfigurationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate: number;

  @IsEnum(TaxCollectionMode)
  collectionMode: TaxCollectionMode;

  @IsEnum(TaxPayer)
  payer: TaxPayer;

  @IsUUID()
  countryId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stateId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lgId?: string | null;

  @ApiPropertyOptional({ enum: BasicStatus })
  @IsOptional()
  @IsEnum(BasicStatus)
  status?: BasicStatus;
}

export class UpdateTaxConfigurationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate?: number;

  @ApiPropertyOptional({ enum: TaxCollectionMode })
  @IsOptional()
  @IsEnum(TaxCollectionMode)
  collectionMode?: TaxCollectionMode;

  @ApiPropertyOptional({ enum: TaxPayer })
  @IsOptional()
  @IsEnum(TaxPayer)
  payer?: TaxPayer;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  countryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stateId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lgId?: string | null;

  @ApiPropertyOptional({ enum: BasicStatus })
  @IsOptional()
  @IsEnum(BasicStatus)
  status?: BasicStatus;
}

export class TaxConfigurationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  countryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lgId?: string;

  @ApiPropertyOptional({ enum: TaxCollectionMode })
  @IsOptional()
  @IsEnum(TaxCollectionMode)
  collectionMode?: TaxCollectionMode;

  @ApiPropertyOptional({ enum: BasicStatus })
  @IsOptional()
  @IsEnum(BasicStatus)
  status?: BasicStatus;
}

export class CreateTaxSettlementDestinationDto {
  @IsEnum(TaxSettlementDestinationType)
  destinationType: TaxSettlementDestinationType;

  @ValidateIf(
    (input: CreateTaxSettlementDestinationDto) =>
      input.destinationType === TaxSettlementDestinationType.BANK_ACCOUNT,
  )
  @IsUUID()
  settlementBankAccountId?: string | null;

  @ValidateIf(
    (input: CreateTaxSettlementDestinationDto) =>
      input.destinationType === TaxSettlementDestinationType.WALLET,
  )
  @IsUUID()
  walletId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerRevenueCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  governmentAgencyCode?: string | null;

  @ApiPropertyOptional({ enum: BasicStatus })
  @IsOptional()
  @IsEnum(BasicStatus)
  status?: BasicStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}

export class UpdateTaxSettlementDestinationDto {
  @ApiPropertyOptional({ enum: TaxSettlementDestinationType })
  @IsOptional()
  @IsEnum(TaxSettlementDestinationType)
  destinationType?: TaxSettlementDestinationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  settlementBankAccountId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  walletId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerRevenueCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  governmentAgencyCode?: string | null;

  @ApiPropertyOptional({ enum: BasicStatus })
  @IsOptional()
  @IsEnum(BasicStatus)
  status?: BasicStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}

export class TaxTransactionQueryDto {
  @ApiPropertyOptional({ enum: TaxTransactionStatus })
  @IsOptional()
  @IsEnum(TaxTransactionStatus)
  status?: TaxTransactionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  taxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  transactionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}
