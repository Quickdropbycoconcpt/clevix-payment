import { TransactionSource } from '../enum';
import { SupportedPaymentMethod } from 'src/modules/service-checkout-invoice/entity/invoice_transaction.entity';
import { FormType } from 'src/modules/service-checkout/entity/service_payment_form.entity';

export const INVOICE_OPTION_BASED_FORM_TYPES = [
  FormType.SELECT,
  FormType.RADIO,
  FormType.CHECKBOX,
];

export const INVOICE_ACTIVE_PAYMENT_ATTEMPT_WINDOW_MS = 2 * 60 * 1000;

export const INVOICE_MAX_REFERENCE_GENERATION_ATTEMPTS = 5;

export const VIRTUAL_ACCOUNT_MIN_VALIDITY_MINUTES = 1;
export const VIRTUAL_ACCOUNT_MAX_VALIDITY_MINUTES = 1440;
export const VIRTUAL_ACCOUNT_DEFAULT_VALIDITY_MINUTES = 30;

export const FEE_SOURCE_BY_METHOD: Record<
  SupportedPaymentMethod,
  TransactionSource
> = {
  [SupportedPaymentMethod.POS]: TransactionSource.POS_COLLECTION,
  [SupportedPaymentMethod.TRANSFER]: TransactionSource.VIRTUAL_ACCOUNT_COLLECTION,
  [SupportedPaymentMethod.CARD]: TransactionSource.DEBIT_CARD_COLLECTION,
};
