import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { IsBigIntAmountString } from 'src/shared/validators/is-bigint-amount-string.validator';

export class SelectedInvoiceItemDto {
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @ApiPropertyOptional({
    description:
      'Amount for this item, in the smallest currency unit. Required when the item does not use a fixed price.',
  })
  @IsOptional()
  @IsBigIntAmountString()
  amount?: string;
}

export class InvoiceCreationDto {
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  @IsObject()
  @IsNotEmpty()
  formDetails: Record<string, any>;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SelectedInvoiceItemDto)
  items: SelectedInvoiceItemDto[];

  @ApiPropertyOptional({
    description:
      "The merchant's own reference for this invoice, for reconciliation on their end.",
  })
  @IsOptional()
  @IsString()
  merchantReference?: string;
}
