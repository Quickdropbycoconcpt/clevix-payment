import { CollectionChannel, IncomingPaymentSource } from '../enum';

/**
 * Only collection channels that can actually enter the settlement pipeline are
 * mapped here. Anything else has no settlement config to look up, so it falls
 * back to instant crediting.
 */
export const COLLECTION_CHANNEL_TO_PAYMENT_SOURCE: Partial<
  Record<CollectionChannel, IncomingPaymentSource>
> = {
  [CollectionChannel.POS]: IncomingPaymentSource.POS_COLLECTION,
  [CollectionChannel.DEBIT_CARD]: IncomingPaymentSource.DEBIT_CARD,
  [CollectionChannel.VIRTUAL_ACCOUNT]:
    IncomingPaymentSource.VIRTUAL_ACCOUNT_COLLECTION,
};
