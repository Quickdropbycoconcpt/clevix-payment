import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AddSettlementBankDto {
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  accountName: string;

  @IsUUID()
  @IsNotEmpty()
  providerbankId: string;
}
