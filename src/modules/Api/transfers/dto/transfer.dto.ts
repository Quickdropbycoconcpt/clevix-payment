import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class WithdrawalDto {
  @IsString()
  @IsNotEmpty()
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
