import { IncomingPaymentSource, TransactionSource } from '../enum';

/**
 * Only sources that can actually reach `creditUserWallet` as an incoming
 * credit are mapped here. Anything else (TRANSFER, fees, etc.) has no
 * settlement config to look up, so it falls back to instant crediting.
 */
export const TRANSACTION_SOURCE_TO_PAYMENT_SOURCE: Partial<
  Record<TransactionSource, IncomingPaymentSource>
> = {
  [TransactionSource.POS_COLLECTION]: IncomingPaymentSource.POS_COLLECTION,
  [TransactionSource.DEBIT_CARD_COLLECTION]: IncomingPaymentSource.DEBIT_CARD,
  [TransactionSource.VIRTUAL_ACCOUNT_COLLECTION]:
    IncomingPaymentSource.VIRTUAL_ACCOUNT_COLLECTION,
};
