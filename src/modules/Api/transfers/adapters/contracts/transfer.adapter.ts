import { TransferQueJobData } from '../../job/transfer-queue-job';
import {
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
}
