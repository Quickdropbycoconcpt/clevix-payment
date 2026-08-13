import { FormType } from '../entity/service_payment_form.entity';

export type CreateFormOption = {
  label: string;
  value: string;
  sequenceNo: string;
};

export type CreateCustomForm = {
  formType: FormType;
  formKey: string;
  formLabel: string;
  formLength: string;
  sequenceNo: string;
  required: string;
  options?: CreateFormOption[];
};

export type CreateServiceItem = {
  name: string;
  fixedPrice: boolean;
  fixedAmount?: string;
  settlementAccountId: string;
  taxId?: string | null;
};

export type CreatePaymentRule = {
  chargeFee: boolean;
  acceptPartPayment: boolean;
  invoiceExpiryMinutes?: number;
  currencyCode: string;
};

export type CreateService = {
  businessId: string;
  environment: string;
  serviceName: string;
  apiInitiationOnly?: boolean;
  customerPayForListOfItems: boolean;
  paymentRule: CreatePaymentRule;
  customForms: CreateCustomForm[];
  items: CreateServiceItem[];
};
