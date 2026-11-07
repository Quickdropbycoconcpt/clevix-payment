import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { IsBigIntAmountString } from 'src/shared/validators/is-bigint-amount-string.validator';
import {
  StaticAccountSweep,
  SweepType,
} from '../interface/sweep-transfer.interface';

export class StaticAccountSweepDto implements StaticAccountSweep {
  @ApiProperty({ example: '1234567890' })
  @IsString()
  @IsNotEmpty()
  staticAccountNumber: string;

  @ApiProperty({ example: '100000' })
  @IsBigIntAmountString()
  amount: string;

  @ApiProperty({ example: 'SWEEP-20261106-0001' })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiProperty({ enum: SweepType })
  @IsEnum(SweepType)
  type: SweepType;
}
