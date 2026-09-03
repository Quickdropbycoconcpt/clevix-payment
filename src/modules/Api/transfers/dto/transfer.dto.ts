import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsBigIntAmountString } from 'src/shared/validators/is-bigint-amount-string.validator';

export class WithdrawalDto {
  @IsBigIntAmountString()
  amount: string;

  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  narration: string;

  @IsString()
  @IsNotEmpty()
  reference: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  senderAccount: string;

  @IsString()
  @IsNotEmpty()
  accountName: string;
}
