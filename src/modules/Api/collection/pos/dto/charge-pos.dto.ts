import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import type { TransactionType } from 'src/shared/encryption';
import { PosChargePurpose } from 'src/shared/enum';

export class ChargePosDto {
  @IsString()
  @IsNotEmpty()
  pan: string;

  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  iccData: string;

  @IsString()
  @IsNotEmpty()
  track2Data: string;

  @IsString()
  @IsNotEmpty()
  cardExpiryDate: string;

  @IsString()
  @IsNotEmpty()
  serialNumber: string;

  @IsString()
  @IsNotEmpty()
  source: TransactionType;

  @IsString()
  @IsNotEmpty()
  sequenceNumber: string;

  @IsOptional()
  @IsString()
  pin: string;

  @IsString()
  @IsNotEmpty()
  accountType: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiPropertyOptional({ example: 'customer@clevix.com' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({
    description:
      'Identifier of the merchant to fund when charging on their behalf from a terminal not tied to their business',
    example: 'AB12CD34EF56',
  })
  @IsOptional()
  @IsString()
  businessIdentifier?: string;

  @ApiPropertyOptional({
    description:
      'Why the customer is paying: topping up a wallet vs buying something from the merchant',
    enum: PosChargePurpose,
  })
  @IsOptional()
  @IsEnum(PosChargePurpose)
  purpose?: PosChargePurpose;

  @ApiPropertyOptional({
    description:
      "Opaque reference the merchant uses to reconcile the charge on their end - the paying customer's account id when purpose is WALLET_FUNDING, or the item/order id when purpose is PURCHASE. Clevix does not interpret this value.",
    example: 'order_12345',
  })
  @IsOptional()
  @IsString()
  accountOrItemId?: string;
}
