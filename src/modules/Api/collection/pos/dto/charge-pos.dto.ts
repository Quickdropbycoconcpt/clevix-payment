import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { CollectionProvider } from '../../adapters/contracts/collection-adapter.types';

export class ChargePosDto {
  @ApiPropertyOptional({
    enum: CollectionProvider,
    default: CollectionProvider.VFD,
  })
  @IsOptional()
  @IsEnum(CollectionProvider)
  provider?: CollectionProvider;

  @ApiProperty({ example: 'TERM-001' })
  @IsString()
  @IsNotEmpty()
  terminalId: string;

  @ApiProperty({ example: 500000 })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: 'NGN', default: 'NGN' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  currency?: string;

  @ApiPropertyOptional({ example: 'pos-sale-10001' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reference?: string;

  @ApiPropertyOptional({ example: 'customer@clevix.com' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({
    example: {
      outletId: 'outlet-001',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
