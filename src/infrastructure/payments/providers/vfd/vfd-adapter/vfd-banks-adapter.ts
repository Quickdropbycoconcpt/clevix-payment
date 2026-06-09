import {
  AccountValidationResult,
  BankDefinition,
  BankDirectoryAdapter,
} from 'src/modules/Api/banks/adapters/banks.adapter';

export class VfdBanksManagementAdapter implements BankDirectoryAdapter {
  getBanks(): Promise<BankDefinition[]> {
    throw new Error('Method not implemented.');
  }
  validateAccountNumber(
    accountNumber: string,
    bankCode: string,
  ): Promise<AccountValidationResult> {
    throw new Error('Method not implemented.');
  }
}
