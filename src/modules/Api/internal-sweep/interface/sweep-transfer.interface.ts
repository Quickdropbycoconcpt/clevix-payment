export enum SweepType {
  PROFIT = 'PROFIT',
  CHARGES = 'CHARGES',
  DEPOSIT = 'DEPOSIT',
  REFUND = 'REFUND',
  WITHDRAWAL = 'WITHDRAWAL',
}

export enum SweepDirection {
  CORPORATE_TO_STATIC = 'CORPORATE_TO_STATIC',
  STATIC_TO_CORPORATE = 'STATIC_TO_CORPORATE',
  CORPORATE_TO_CORPORATE = 'CORPORATE_TO_CORPORATE',
}

export type StaticAccountSweep = {
  staticAccountNumber: string;

  amount: string;

  reference: string;

  type: SweepType;
};

export type CorporateAccountSweep = {
  subAccountNumber: string;

  mainCorporateAccount: string;

  environment: string;

  amount: string;

  reference: string;

  type: SweepType;
};
