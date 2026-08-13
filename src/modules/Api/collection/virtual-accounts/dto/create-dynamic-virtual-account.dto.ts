import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { CollectionProvider } from '../../adapters/contracts/collection-adapter.types';

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
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'amount must be a positive integer string',
  })
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
