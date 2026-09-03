import { IsNotEmpty, IsString } from 'class-validator';
import type { TransactionType } from 'src/shared/encryption';
import { IsBigIntAmountString } from 'src/shared/validators/is-bigint-amount-string.validator';

export class PosPaymentIntentDto {
  @IsString()
  @IsNotEmpty()
  pan: string;

  @IsBigIntAmountString()
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
