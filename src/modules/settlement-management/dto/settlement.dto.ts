import { IsNotEmpty, IsString } from 'class-validator';

export class AddSettlementBankDto {
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  accountName: string;

  @IsString()
  @IsNotEmpty()
  providerbankId: string;
}
