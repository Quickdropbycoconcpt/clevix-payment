export enum ErrorCode {
  INVALID_BVN = 'INVALID_BVN',
  BVN_NOT_FOUND = 'BVN_NOT_FOUND',
  INVALID_NIN = 'INVALID_NIN',
  NIN_NOT_FOUND = 'NIN_NOT_FOUND',
  FACE_MISMATCH = 'FACE_MISMATCH',
  INVALID_IMAGE = 'INVALID_IMAGE',
  KYC_VERIFICATION_FAILED = 'KYC_VERIFICATION_FAILED',

  INVALID_ACCOUNT_NUMBER = 'INVALID_ACCOUNT_NUMBER',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  UNSUPPORTED_BANK = 'UNSUPPORTED_BANK',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  AMOUNT_LIMIT_EXCEEDED = 'AMOUNT_LIMIT_EXCEEDED',
  DUPLICATE_REFERENCE = 'DUPLICATE_REFERENCE',
  TRANSFER_FAILED = 'TRANSFER_FAILED',

  INVALID_CARD = 'INVALID_CARD',
  INVALID_OTP = 'INVALID_OTP',
  CARD_DECLINED = 'CARD_DECLINED',
  PAYMENT_SESSION_EXPIRED = 'PAYMENT_SESSION_EXPIRED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',

  ACCOUNT_CREATION_FAILED = 'ACCOUNT_CREATION_FAILED',
  CUSTOMER_EMAIL_REQUIRED = 'CUSTOMER_EMAIL_REQUIRED',
  OPERATION_NOT_SUPPORTED = 'OPERATION_NOT_SUPPORTED',

  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  SERVICE_CONFIGURATION_ERROR = 'SERVICE_CONFIGURATION_ERROR',
  SERVICE_ERROR = 'SERVICE_ERROR',
}

const UNAVAILABLE_MESSAGE =
  'This service is temporarily unavailable. Please try again shortly';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.INVALID_BVN]: 'The BVN provided is invalid',
  [ErrorCode.BVN_NOT_FOUND]: 'No record was found for the BVN provided',
  [ErrorCode.INVALID_NIN]: 'The NIN provided is invalid',
  [ErrorCode.NIN_NOT_FOUND]: 'No record was found for the NIN provided',
  [ErrorCode.FACE_MISMATCH]: 'The selfie does not match the identity record',
  [ErrorCode.INVALID_IMAGE]:
    'The image provided could not be processed. Please use a clear photo',
  [ErrorCode.KYC_VERIFICATION_FAILED]:
    'We could not complete the verification. Please try again',
  [ErrorCode.INVALID_ACCOUNT_NUMBER]: 'The account number provided is invalid',
  [ErrorCode.ACCOUNT_NOT_FOUND]: 'The recipient account could not be found',
  [ErrorCode.UNSUPPORTED_BANK]:
    'The selected bank is not supported at the moment',
  [ErrorCode.INSUFFICIENT_FUNDS]:
    'Insufficient funds to complete this transaction',
  [ErrorCode.AMOUNT_LIMIT_EXCEEDED]:
    'The amount exceeds the allowed limit for this transaction',
  [ErrorCode.DUPLICATE_REFERENCE]:
    'A transaction with this reference already exists',
  [ErrorCode.TRANSFER_FAILED]: 'The transfer could not be completed',
  [ErrorCode.INVALID_CARD]: 'The card details provided are invalid',
  [ErrorCode.INVALID_OTP]: 'The OTP provided is invalid or has expired',
  [ErrorCode.CARD_DECLINED]: 'The card was declined',
  [ErrorCode.PAYMENT_SESSION_EXPIRED]:
    'The payment session has expired. Please start the payment again',
  [ErrorCode.PAYMENT_FAILED]: 'The payment could not be completed',
  [ErrorCode.ACCOUNT_CREATION_FAILED]:
    'We could not create the account. Please try again',
  [ErrorCode.CUSTOMER_EMAIL_REQUIRED]:
    'A customer email is required for this request',
  [ErrorCode.OPERATION_NOT_SUPPORTED]:
    'This operation is not supported for this account',
  [ErrorCode.SERVICE_UNAVAILABLE]: UNAVAILABLE_MESSAGE,
  [ErrorCode.SERVICE_CONFIGURATION_ERROR]: UNAVAILABLE_MESSAGE,
  [ErrorCode.SERVICE_ERROR]:
    'Something went wrong while processing your request',
};
