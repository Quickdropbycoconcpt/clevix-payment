import { TransactionSource } from 'src/shared/enum';

export class CreateWalletInterface {
  businessId: string;

  countryId?: string;

  currency: string;
}

export type CreditWallet = {
  businessId: string;
  environment: string;
  currency: string;
  provider: string;
  source: TransactionSource;
  amount: string;
  reference: string;
  sourceId?: string | null;
  merchantReference?: string | null;
  providerReference?: string | null;
  metadata?: Record<string, unknown>;
  /**
   * Set when the fee was already computed and collected upstream (e.g. added
   * onto what the payer was charged) so getFeeBySource shouldn't recompute
   * chargedFee off `amount` again.
   */
  feeCharged?: string | null;
};

export type DebitWallet = {
  businessId: string;
  environment: string;
  currency: string;
  narration: string;
  provider: string;
  source: TransactionSource;
  amount: string;
  reference: string;
  sourceId?: string | null;
  merchantReference?: string | null;
  providerReference?: string | null;
  metadata?: Record<string, unknown>;
};
