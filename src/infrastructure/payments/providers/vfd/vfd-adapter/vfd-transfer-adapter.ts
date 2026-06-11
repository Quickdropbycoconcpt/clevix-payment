import { TransferAdapter } from 'src/modules/Api/transfers/adapters/contracts/transfer.adapter';
import { VfdClient } from '../vfd.client';
import {
  TransactionQueryStatus,
  TransactionStatusQuery,
  TransferProvider,
} from 'src/modules/Api/transfers/types/transfer-provider';
import { Injectable } from '@nestjs/common';
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
}
