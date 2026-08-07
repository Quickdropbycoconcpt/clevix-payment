import { Injectable } from '@nestjs/common';
import {
  AccountValidationResult,
  BankDefinition,
  BankDirectoryAdapter,
} from 'src/modules/Api/banks/adapters/banks.adapter';
import { RequestEnvironment } from 'src/shared/enum';
import { VfdClient } from '../vfd.client';

@Injectable()
export class VfdBanksManagementAdapter implements BankDirectoryAdapter {
  constructor(private readonly vfdClient: VfdClient) {}

  async getBanks(): Promise<BankDefinition[]> {
    const banks = await this.vfdClient.vfdBankList();

    return banks.map((bank) => ({
      name: bank.name,
      bankCode: bank.bankCode ?? bank.code,
    }));
  }

  async validateAccountNumber(
    accountNumber: string,
    bankCode: string,
  ): Promise<AccountValidationResult> {
    return this.vfdClient.vfdAccountValidation(RequestEnvironment.LIVE, {
      accountNumber,
      bankCode,
    });
  }
}
