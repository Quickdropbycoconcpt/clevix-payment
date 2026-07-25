import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { FormType } from '../entity/service_payment_form.entity';

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
  @IsNumberString()
  @Matches(/^[1-9]\d*$/, {
    message: 'fixedAmount must be a positive integer string',
  })
  fixedAmount?: string;

  @IsString()
  @IsNotEmpty()
  settlementAccountId: string;
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
