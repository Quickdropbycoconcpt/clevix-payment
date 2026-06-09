import { IntegerAmount } from 'src/shared/utils';

export type TransactionFeeAmount = IntegerAmount;

export type TransactionFeeInput = {
  transactionId: string;

  businessId: string;

  provider: string;

  feeSource: string;

  grossAmount: TransactionFeeAmount;

  chargedFee: TransactionFeeAmount;

  providerFee: TransactionFeeAmount;

  platformRevenue?: TransactionFeeAmount;
};
