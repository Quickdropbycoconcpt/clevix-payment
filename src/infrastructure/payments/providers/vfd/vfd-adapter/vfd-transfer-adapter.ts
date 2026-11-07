import { TransferAdapter } from 'src/modules/Api/transfers/adapters/contracts/transfer.adapter';
import { VfdClient } from '../vfd.client';
import {
  AccountBalance,
  AccountBalanceEnquiry,
  TransactionQueryStatus,
  TransactionStatusQuery,
  TransferProvider,
} from 'src/modules/Api/transfers/types/transfer-provider';
import { BadRequestException, Injectable } from '@nestjs/common';
import { MoneyValueConverter } from 'src/shared/converter';
import { TransferQueJobData } from 'src/modules/Api/transfers/job/transfer-queue-job';
@Injectable()
export class VfdTransferProvider implements TransferAdapter {
  readonly provider = TransferProvider.VFD;

  constructor(private readonly vfdClient: VfdClient) {}
  processPaypout(input: TransferQueJobData) {
    const result = this.vfdClient.vfdTransfer(input);
    return result;
  }
  async transactionStatusQuery(input: TransactionStatusQuery) {
    const result = await this.vfdClient.transactionStatusQuery(input);
    return result;
  }

  async accountBalanceEnquiry(
    input: AccountBalanceEnquiry,
  ): Promise<AccountBalance> {
    const account = await this.vfdClient.vfdsenderaccountEnquiry(
      input.environment,
      input.accountNumber,
    );

    if (account?.accountBalance === undefined || account.accountBalance === null) {
      throw new BadRequestException('Unable to fetch account balance');
    }

    return {
      accountNumber: account.accountNo,
      balance: MoneyValueConverter.fromNairaToKobo(
        String(account.accountBalance),
      ).toString(),
    };
  }
}
