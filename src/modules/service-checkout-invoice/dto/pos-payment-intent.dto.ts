import {
  IsNotEmpty,
  IsNumberString,
  IsString,
  Matches,
} from 'class-validator';
import type { TransactionType } from 'src/shared/encryption';

export class PosPaymentIntentDto {
  @IsString()
  @IsNotEmpty()
  pan: string;

  @IsNumberString()
  @Matches(/^[1-9]\d*$/, {
    message: 'amount must be a positive integer string',
  })
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

  @IsString()
  @IsNotEmpty()
  accountType: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  pin: string;
}
