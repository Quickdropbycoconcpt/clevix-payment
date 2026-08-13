import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateAccountDto {
  @IsString()
  @IsNotEmpty()
  accountNumber: string;
  @IsString()
  @IsNotEmpty()
  bankCode: string;
}
