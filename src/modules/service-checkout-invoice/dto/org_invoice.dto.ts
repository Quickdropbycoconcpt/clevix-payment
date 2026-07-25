import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateNested,
} from 'class-validator';

export class SelectedInvoiceItemDto {
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @ApiPropertyOptional({
    description:
      'Amount for this item, in the smallest currency unit. Required when the item does not use a fixed price.',
  })
  @IsOptional()
  @IsNumberString()
  @Matches(/^[1-9]\d*$/, {
    message: 'amount must be a positive integer string',
  })
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
