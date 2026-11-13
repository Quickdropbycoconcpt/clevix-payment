import { Injectable } from '@nestjs/common';
import {
  AccountValidationResult,
  BankDefinition,
  BankDirectoryAdapter,
} from 'src/modules/Api/banks/adapters/banks.adapter';
import { RequestEnvironment } from 'src/shared/enum';
import { MonnifyClient } from '../monnify.client';

@Injectable()
export class MonnifyBanksManagementAdapter implements BankDirectoryAdapter {
  constructor(private readonly monnifyClient: MonnifyClient) {}

  async getBanks(): Promise<BankDefinition[]> {
    const banks = await this.monnifyClient.bankList();

    return banks.map((bank) => ({
      name: bank.name,
      bankCode: bank.code,
    }));
  }

  async validateAccountNumber(
    accountNumber: string,
    bankCode: string,
  ): Promise<AccountValidationResult> {
    return this.monnifyClient.validateAccount(
      RequestEnvironment.LIVE,
      accountNumber,
      bankCode,
    );
  }
}
