import { Injectable } from '@nestjs/common';
import { TransferAdapter } from 'src/modules/Api/transfers/adapters/contracts/transfer.adapter';
import {
  AccountBalance,
  AccountBalanceEnquiry,
  TransactionQueryStatus,
  TransactionStatusQuery,
  TransferProvider,
  TransferStatusResult,
} from 'src/modules/Api/transfers/types/transfer-provider';
import { TransferQueJobData } from 'src/modules/Api/transfers/job/transfer-queue-job';
import { MoneyValueConverter } from 'src/shared/converter';
import { MonnifyClient } from '../monnify.client';

@Injectable()
export class MonnifyTransferProvider implements TransferAdapter {
  readonly provider = TransferProvider.MONNIFY;

  constructor(private readonly monnifyClient: MonnifyClient) {}

  processPaypout(input: TransferQueJobData) {
    return this.monnifyClient.singleTransfer({
      environment: input.environment,
      amountInNaira: MoneyValueConverter.fromKoboToNaira(input.amount),
      reference: input.reference,
      narration: input.narration,
      destinationBankCode: input.bankCode,
      destinationAccountNumber: input.accountNumber,
      sourceAccountNumber: input.senderAccount,
    });
  }

  async transactionStatusQuery(
    input: TransactionStatusQuery,
  ): Promise<TransactionQueryStatus> {
    try {
      const result = await this.monnifyClient.transferStatus(
        input.environment,
        input.reference,
      );

      return {
        status: this.toTransferStatusResult(result.status),
        providerStatus: result.status,
        sessionId: result.sessionId,
        reference: input.reference,
      };
    } catch {
      return {
        status: TransferStatusResult.PENDING,
        sessionId: null,
        reference: input.reference,
      };
    }
  }

  private toTransferStatusResult(providerStatus?: string): TransferStatusResult {
    switch (providerStatus) {
      case 'SUCCESS':
        return TransferStatusResult.SUCCESS;
      case 'FAILED':
      case 'REVERSED':
      case 'EXPIRED':
        return TransferStatusResult.FAILED;
      default:
        return TransferStatusResult.PENDING;
    }
  }

  async accountBalanceEnquiry(
    input: AccountBalanceEnquiry,
  ): Promise<AccountBalance> {
    const wallet = await this.monnifyClient.walletBalance(
      input.environment,
      input.accountNumber,
    );

    return {
      accountNumber: input.accountNumber,
      balance: MoneyValueConverter.fromNairaToKobo(
        Number(wallet.availableBalance).toFixed(2),
      ).toString(),
    };
  }
}
