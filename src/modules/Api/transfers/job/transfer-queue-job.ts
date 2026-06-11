import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { JobQueueList } from 'src/shared/enum';
export type TransferQueJobData = {
  amount: string;
  bankCode: string;
  merchantReference: string;
  reference: string;
  narration: string;
  currency: string;
  senderAccount?: string;
  accountNumber: string;
  environment: string;
  accountName: string;
  provider: string;
};

@Injectable()
export class AddTransferIntoQue {
  constructor(
    @InjectQueue(JobQueueList.MONEY_TRANSFER_PROCESSOR)
    private readonly transferQueue: Queue<TransferQueJobData>,
  ) {}

  async addTransferProcessingQueue(input: TransferQueJobData) {
    await this.transferQueue.add(JobQueueList.MONEY_TRANSFER_PROCESSOR, input, {
      attempts: 1,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        age: 24 * 3600,
        count: 1000,
      },

      removeOnFail: {
        age: 7 * 24 * 3600,
        count: 5000,
      },

      jobId: input.reference,
    });
  }
}
