export enum RequestEnvironment {
  TEST = 'TEST',
  LIVE = 'LIVE',
}

export enum BasicStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum TransactionSource {
  COLLECTION_FEE = 'COLLECTION_FEE',
  VIRTUAL_ACCOUNT_COLLECTION = 'VIRTUAL_ACCOUNT_COLLECTION',
  TRANSFER = 'TRANSFER',
  BILLS_PAYMENT = 'BILLS_PAYMENT',
  BILLS_PAYMENT_FEE = 'BILLS_PAYMENT_FEE',
  TRANSFER_FEE = 'TRANSFER_FEE',
  STAMP_DUTY = 'STAMP_DUTY',
}

export enum LedgerEntryDirection {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum TransactionStatus {
  INITIATED = 'INITIATED',
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum TransactionSettlementStatus {
  UNSETTLED = 'UNSETTLED',
  SETTLED = 'SETTLED',
  REVERSED = 'REVERSED',
}

export enum TransactionRiskStatus {
  CLEAR = 'CLEAR',
  HELD = 'HELD',
  DISPUTED = 'DISPUTED',
}
