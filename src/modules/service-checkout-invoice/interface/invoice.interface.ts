import { SupportedPaymentMethod } from '../entity/invoice_transaction.entity';

export type SelectedInvoiceItem = {
  itemId: string;
  amount?: string;
};

export type CreateInvoice = {
  serviceId: string;
  formDetails: Record<string, any>;
  items: SelectedInvoiceItem[];
  merchantReference?: string;
};

export type PayInvoice = {
  reference: string;

  method: SupportedPaymentMethod;

  intent?: Record<string, any>;
};
