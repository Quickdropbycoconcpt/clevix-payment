import { OrganisationInvoice } from '../entity/service_checkout_invoice.entity';
import { InvoicePaymentTransaction } from '../entity/invoice_transaction.entity';

export interface InvoicePaymentInitiator {
  initiate(
    invoice: OrganisationInvoice,
    attempt: InvoicePaymentTransaction,
    intent: Record<string, any>,
  ): Promise<Record<string, any>>;
}
