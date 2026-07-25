import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganisationInvoice } from '../entity/service_checkout_invoice.entity';
import { InvoicePaymentTransaction } from '../entity/invoice_transaction.entity';
import { TransactionModule } from 'src/modules/transactions/transactions.module';
import { InvoiceReconciliationService } from './invoice-reconciliation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganisationInvoice, InvoicePaymentTransaction]),
    TransactionModule,
  ],
  providers: [InvoiceReconciliationService],
  exports: [InvoiceReconciliationService],
})
export class InvoiceReconciliationModule {}
