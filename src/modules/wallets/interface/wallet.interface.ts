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
