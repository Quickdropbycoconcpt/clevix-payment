import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { DateRangeQueryDto } from 'src/shared/http/date-range.dto';
import { SettlementTransactionStatus } from '../entity/settlement-status.enum';

export class ListSettlementsQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ enum: SettlementTransactionStatus })
  @IsOptional()
  @IsEnum(SettlementTransactionStatus)
  status?: SettlementTransactionStatus;
}
