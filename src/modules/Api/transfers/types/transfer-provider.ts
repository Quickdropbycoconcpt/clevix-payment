export enum TransferProvider {
  VFD = 'vfd',
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

export type TransactionQueryStatus = {
  success: boolean;
  sessionId: string;
  status?: string;
  reference: string;
};
