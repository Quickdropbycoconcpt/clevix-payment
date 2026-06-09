import { CollectionProvider } from './collection-adapter.types';

export type CreateVirtualAccountInput = {
  businessId: string;
  environment: string;
  reference: string;
  merchantReference: string;
  accountName: string;
  amountValidation: string;
  amount: string;
  customerEmail?: string;
  validityTime: number;
  metadata?: Record<string, unknown>;
};

export type CreateIndividualStaticAccount = {
  firstName: string;
  lastName: string;
  bvn: string;
  environment: string;
  phoneNumber: string;
  dob: string;
  nin: string;
  address: string;
};

export type CreateCorporateStaticAccount = {
  rcNumber: string;
  companyName: string;
  incorporationDate: string;
  environment: string;
  bvn: string;
  nin: string;
  businessType: string;
  address: string;
  state: string;
};

export type VirtualAccountCreditResponse = {
  amount: number;
  reference: string;
  senderAccountNumber: string;
  senderName: string;
  receivedAccountNumber: string;
  narration: string;
  sessionId: string;
};

export type IndividualStaticAccountResponse = {
  firstName?: string;
  lastname?: string;
  accountName?: string;
  bankName: string;
  accountNumber: string;
  middleName?: string;
  currentTier?: string;
};

export type CreateVirtualAccountResult = {
  accountNumber: string;
  reference: string;
  accountName: string;
  bankName: string;
};

export type CorporateAccountResponse = {
  accountNumber: string;
  accountName: string;
  bankName: string;
};

export type SimulateInwardCreditInput = {
  environment: string;
  accountNumber: string;
  narration?: string;
  reference: string;
  amount: number;
};

export interface VirtualAccountAdapter {
  readonly provider: CollectionProvider;

  createVirtualAccount(
    input: CreateVirtualAccountInput,
  ): Promise<CreateVirtualAccountResult>;

  createIndividualStaticAccount(
    input: CreateIndividualStaticAccount,
  ): Promise<IndividualStaticAccountResponse>;

  createBusinessStaticAccount(
    input: CreateCorporateStaticAccount,
  ): Promise<CorporateAccountResponse>;

  simulateIncomingCredit(
    input: SimulateInwardCreditInput,
  ): Promise<{ message: string }>;

  incomingPaymentWebhook(input: any): VirtualAccountCreditResponse;
}
