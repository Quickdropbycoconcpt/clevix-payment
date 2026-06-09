import { TransactionSource } from 'src/shared/enum';
import { VirtualAccountCreditResponse } from '../../adapters/contracts/virtual-account.adapter';

export const VIRTUAL_ACCOUNT_CREDIT_QUEUE = 'VIRTUAL_ACCOUNT_CREDIT';
export const VIRTUAL_ACCOUNT_CREDIT_JOB = 'PROCESS_VIRTUAL_ACCOUNT_CREDIT';

export type VirtualAccountCreditJobData = {
  dvaId: string;
  businessId: string;
  source: TransactionSource;
  environment: string;
  provider: string;
  merchantReference: string;
  credit: VirtualAccountCreditResponse;
};
