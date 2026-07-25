import { Transactions } from 'src/modules/transactions/entity/transaction.entity';

export interface ReconciliationHandler {
  /**
   * Attempt to reconcile `merchantRef` against the already-resolved
   * source-of-truth transaction. Return true if this handler owns
   * `merchantRef` (whether or not it changed anything), so the registry
   * stops trying other handlers.
   */
  handle(merchantRef: string, transaction: Transactions): Promise<boolean>;
}
