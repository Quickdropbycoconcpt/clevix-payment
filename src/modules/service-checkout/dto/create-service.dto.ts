import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { FormType } from '../entity/service_payment_form.entity';
import { IsBigIntAmountString } from 'src/shared/validators/is-bigint-amount-string.validator';

export class CreatePaymentRuleDto {
  @IsBoolean()
  chargeFee: boolean;

  @IsBoolean()
  acceptPartPayment: boolean;

  @ApiPropertyOptional({
    description:
      'How long a generated invoice stays payable before expiring, in minutes.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  invoiceExpiryMinutes?: number;

  @IsString()
  @IsNotEmpty()
  currencyCode: string;
}

export class CreateServiceItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  fixedPrice: boolean;

  @ApiPropertyOptional({
    description:
      'Fixed amount for this item, in the smallest currency unit. Required when fixedPrice is true.',
  })
  @ValidateIf((item: CreateServiceItemDto) => item.fixedPrice)
  @IsNotEmpty({ message: 'fixedAmount is required when fixedPrice is true' })
  @IsBigIntAmountString()
  fixedAmount?: string;

  @IsUUID()
  settlementAccountId: string;

  @ApiPropertyOptional({
    description: 'Platform tax configuration to apply to this item.',
  })
  @IsOptional()
  @IsString()
  taxId?: string | null;
}

export class UpdateServiceItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fixedPrice?: boolean;

  @ApiPropertyOptional({
    description:
      'Fixed amount for this item, in the smallest currency unit. Required when fixedPrice is true.',
  })
  @ValidateIf((item: UpdateServiceItemDto) => item.fixedAmount !== undefined)
  @IsBigIntAmountString()
  fixedAmount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  settlementAccountId?: string;

  @ApiPropertyOptional({
    description: 'Platform tax configuration to apply to this item.',
  })
  @IsOptional()
  @IsString()
  taxId?: string | null;
}

export class UpdateServiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  serviceName?: string;

  @ApiPropertyOptional({
    description:
      'Whether this service can only be initiated via API, not through the public checkout page',
  })
  @IsOptional()
  @IsBoolean()
  apiInitiationOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  customerPayForListOfItems?: boolean;
}

export class CreateFormOptionDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsNotEmpty()
  sequenceNo: string;
}

export class CreateCustomFormDto {
  @IsEnum(FormType)
  formType: FormType;

  @IsString()
  @IsNotEmpty()
  formKey: string;

  @IsString()
  @IsNotEmpty()
  formLabel: string;

  @IsString()
  @IsNotEmpty()
  formLength: string;

  @IsString()
  @IsNotEmpty()
  sequenceNo: string;

  @IsString()
  @IsNotEmpty()
  required: string;

  @ApiPropertyOptional({
    description:
      'Selectable options for this field, required when formType is select/radio/checkbox',
    type: [CreateFormOptionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFormOptionDto)
  options?: CreateFormOptionDto[];
}

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @ApiPropertyOptional({
    description:
      'Whether this service can only be initiated via API, not through the public checkout page',
  })
  @IsOptional()
  @IsBoolean()
  apiInitiationOnly?: boolean;

  @IsBoolean()
  customerPayForListOfItems: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateServiceItemDto)
  items: CreateServiceItemDto[];

  @ValidateNested()
  @Type(() => CreatePaymentRuleDto)
  paymentRule: CreatePaymentRuleDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCustomFormDto)
  customForms: CreateCustomFormDto[];
}
