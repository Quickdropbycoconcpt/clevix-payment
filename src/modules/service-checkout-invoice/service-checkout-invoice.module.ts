import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganisationInvoice } from './entity/service_checkout_invoice.entity';
import { InvoicePaymentTransaction } from './entity/invoice_transaction.entity';
import { InvoiceItem } from './entity/invoice_item.entity';
import { OrganisationInvoiceService } from './service/org_invoice.service';
import { ServiceCheckoutModule } from '../service-checkout/service-checkout.module';
import { ServiceInvoiceCheckoutController } from './controller/service-invoice-checkout.controller';
import { PosModule } from '../Api/collection/pos/pos.module';
import { VirtualAccountsModule } from '../Api/collection/virtual-accounts/virtual-accounts.module';
import { Businesses } from '../businesses/entity/business.entity';
import { InvoicePaymentInitiatorFactory } from './initiators/invoice-payment-initiator.factory';
import { PosInvoicePaymentInitiator } from './initiators/pos-invoice-payment.initiator';
import { TransferInvoicePaymentInitiator } from './initiators/transfer-invoice-payment.initiator';
import { InvoiceReconciliationModule } from './reconciliation/invoice-reconciliation.module';
import { FeesModule } from '../fees-configuration/fees.module';
import { InvoiceFeeService } from './fee/invoice-fee.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganisationInvoice,
      InvoicePaymentTransaction,
      InvoiceItem,
      Businesses,
    ]),
    ServiceCheckoutModule,
    PosModule,
    VirtualAccountsModule,
    InvoiceReconciliationModule,
    FeesModule,
  ],
  controllers: [ServiceInvoiceCheckoutController],
  providers: [
    OrganisationInvoiceService,
    InvoicePaymentInitiatorFactory,
    PosInvoicePaymentInitiator,
    TransferInvoicePaymentInitiator,
    InvoiceFeeService,
  ],
})
export class ServiceCheckoutInvoiceModule {}
