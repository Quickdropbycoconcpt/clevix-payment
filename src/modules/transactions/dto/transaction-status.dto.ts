import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TransactionStatusQueryDto {
  @ApiProperty({ example: 'invoice-10001' })
  @IsString()
  @IsNotEmpty()
  reference: string;
}
