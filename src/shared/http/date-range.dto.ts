import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class DateRangeQueryDto {
  @ApiPropertyOptional({ example: '2026-01-31', description: 'YYYY-MM-DD' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'from must be a valid YYYY-MM-DD date' })
  from?: string;

  @ApiPropertyOptional({ example: '2026-02-28', description: 'YYYY-MM-DD' })
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'to must be a valid YYYY-MM-DD date' })
  to?: string;
}
