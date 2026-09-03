import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { CollectionProvider } from '../../adapters/contracts/collection-adapter.types';
import { IsBigIntAmountString } from 'src/shared/validators/is-bigint-amount-string.validator';

export class CreateDynamicVirtualAccountDto {
  @ApiProperty({ example: 'Ada Lovelace' })
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiPropertyOptional({ example: 'customer@clevix.com' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({ example: '500000' })
  @IsBigIntAmountString()
  amount: string;

  @ApiProperty({ example: 'invoice-10001' })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiProperty({ example: 30, minimum: 1, maximum: 1440 })
  @IsInt()
  @Min(1)
  @Max(1440)
  validityTime: number;
}
