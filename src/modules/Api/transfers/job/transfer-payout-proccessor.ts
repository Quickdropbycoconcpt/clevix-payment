import { Processor, WorkerHost } from '@nestjs/bullmq';
import { JobQueueList } from 'src/shared/enum';
import { TransferAdapterFactory } from '../adapters/transfer.adapter.factory';
import { Job } from 'bullmq';
import { TransferQueJobData } from './transfer-queue-job';
import { TransactionService } from 'src/modules/transactions/service/transaction.service';

@Processor(JobQueueList.MONEY_TRANSFER_PROCESSOR)
export class TransferJobProccessor extends WorkerHost {
  constructor(
    private readonly txnService: TransactionService,
    private readonly transferAdapterFactory: TransferAdapterFactory,
  ) {
    super();
  }

  async process(job: Job<TransferQueJobData>) {
    const jobData = job.data;
    const provider = job.data.provider;
    const adapter = this.transferAdapterFactory.getTransferdapter(provider);
    /**
     * Move the transaction status to processing.
     * Transfer in processing indicates the job picked it up.
     */
    await this.txnService.moveOutgoingTransactionToProcessing(
      jobData.reference,
    );
    await adapter.processPaypout(jobData);
  }
}
