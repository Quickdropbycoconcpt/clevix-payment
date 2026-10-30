import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { JobQueueList, WalletTransactionStatus } from 'src/shared/enum';
import { TransferAdapterFactory } from '../adapters/transfer.adapter.factory';
import { Job } from 'bullmq';
import { TransferQueJobData } from './transfer-queue-job';
import { InjectRepository } from '@nestjs/typeorm';
import { WalletTransactions } from 'src/modules/wallets/entity/wallet_transactions.entity';
import { Repository } from 'typeorm';

@Processor(JobQueueList.MONEY_TRANSFER_PROCESSOR)
export class TransferJobProccessor extends WorkerHost {
  private readonly logger = new Logger(TransferJobProccessor.name);

  constructor(
    private readonly transferAdapterFactory: TransferAdapterFactory,
    @InjectRepository(WalletTransactions)
    private readonly walletTransactionRepo: Repository<WalletTransactions>,
  ) {
    super();
  }

  async process(job: Job<TransferQueJobData>) {
    const jobData = job.data;
    const provider = job.data.provider;
    const adapter = this.transferAdapterFactory.getTransferdapter(provider);

    this.logger.log(
      `Processing transfer payout reference=${jobData.reference} provider=${provider}`,
    );

    if (jobData.walletTransactionId) {
      await this.walletTransactionRepo.update(
        { walletTransactionId: jobData.walletTransactionId },
        { status: WalletTransactionStatus.PROCESSING },
      );
    }

    try {
      const result = await adapter.processPaypout(jobData);

      this.logger.log(
        `Completed transfer payout reference=${jobData.reference} provider=${provider}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed transfer payout reference=${jobData.reference} provider=${provider}: ${
          error instanceof Error ? error.message : error
        }`,
        error instanceof Error ? error.stack : undefined,
      );

      if (jobData.walletTransactionId) {
        await this.walletTransactionRepo.update(
          { walletTransactionId: jobData.walletTransactionId },
          {
            status: WalletTransactionStatus.FAILED,
            message: error instanceof Error ? error.message : 'Payout failed',
          },
        );
      }

      throw error;
    }
  }
}
