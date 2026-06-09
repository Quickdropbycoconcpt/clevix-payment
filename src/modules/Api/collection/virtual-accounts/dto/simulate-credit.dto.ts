import { IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class SimulateInwardCreditDto {
  @IsString()
  @IsNotEmpty()
  reference: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  accountNumber: string;

  @IsPositive()
  amount: number;
}
