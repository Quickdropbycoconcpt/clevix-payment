import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DateRangeQueryDto } from 'src/shared/http/date-range.dto';
import {
  CollectionChannel,
  LedgerEntryDirection,
  TransactionSource,
  TransactionStatus,
} from 'src/shared/enum';

export class ListTransactionsQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({ enum: TransactionSource })
  @IsOptional()
  @IsEnum(TransactionSource)
  source?: TransactionSource;

  @ApiPropertyOptional({ enum: CollectionChannel })
  @IsOptional()
  @IsEnum(CollectionChannel)
  collectionChannel?: CollectionChannel;

  @ApiPropertyOptional({ enum: LedgerEntryDirection })
  @IsOptional()
  @IsEnum(LedgerEntryDirection)
  direction?: LedgerEntryDirection;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reference?: string;
}
