import { TransferQueJobData } from '../../job/transfer-queue-job';
import {
  AccountBalance,
  AccountBalanceEnquiry,
  TransactionQueryStatus,
  TransactionStatusQuery,
  TransferProvider,
} from '../../types/transfer-provider';

export interface TransferAdapter {
  readonly provider: TransferProvider;
  processPaypout(input: TransferQueJobData);

  transactionStatusQuery(
    input: TransactionStatusQuery,
  ): Promise<TransactionQueryStatus>;

  accountBalanceEnquiry(input: AccountBalanceEnquiry): Promise<AccountBalance>;
}
