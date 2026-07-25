import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { SupportedPaymentMethod } from '../entity/invoice_transaction.entity';

export class PayInvoiceDto {
  @IsString()
  @IsNotEmpty()
  reference: string;

  @IsEnum(SupportedPaymentMethod)
  method: SupportedPaymentMethod;

  @IsOptional()
  @IsObject()
  intent?: Record<string, any> = {};
}
