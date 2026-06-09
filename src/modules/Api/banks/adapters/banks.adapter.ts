export type BankDefinition = {};
export type AccountValidationResult = {};
export interface BankDirectoryAdapter {
  /** Retrieves the list of supported commercial banks and their routing codes */
  getBanks(): Promise<BankDefinition[]>;

  /** Resolves an account number against a bank code to verify the customer's legal name */
  validateAccountNumber(
    accountNumber: string,
    bankCode: string,
  ): Promise<AccountValidationResult>;
}
