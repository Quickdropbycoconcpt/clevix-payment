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

export type TransactionQueryStatus = {
  success: boolean;
  sessionId: string;
  status?: string;
  reference: string;
};
