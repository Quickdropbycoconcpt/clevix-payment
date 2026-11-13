export enum TransferProvider {
  VFD = 'vfd',
  MONNIFY = 'monnify',
}

export interface AccountValidation {
  accountNumber: string;
  bankCode: string;
}

export type TransactionStatusQuery = {
  environment: string;
  reference: string;
};

export type AccountBalanceEnquiry = {
  environment: string;
  accountNumber: string;
};

export type AccountBalance = {
  accountNumber: string;
  balance: string;
};

export enum TransferStatusResult {
  SUCCESS = 'SUCCESS',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
}

export type TransactionQueryStatus = {
  status: TransferStatusResult;
  providerStatus?: string;
  sessionId: string;
  reference: string;
};
