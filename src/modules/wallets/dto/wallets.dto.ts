import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LedgerEntryDirection } from 'src/shared/enum';

export class WalletTransactionQueryDto {
  @IsEnum(LedgerEntryDirection)
  @IsOptional()
  @ApiPropertyOptional()
  type: LedgerEntryDirection;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @ApiPropertyOptional()
  reference: string;
}
