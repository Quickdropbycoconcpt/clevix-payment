import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { JobQueueList, WalletTransactionStatus } from 'src/shared/enum';
import { TransferAdapterFactory } from '../adapters/transfer.adapter.factory';
import { Job } from 'bullmq';
import { TransferQueJobData } from './transfer-queue-job';
import { InjectRepository } from '@nestjs/typeorm';
import { WalletTransactions } from 'src/modules/wallets/entity/wallet_transactions.entity';
import { Repository } from 'typeorm';
import { FIRST_STATUS_CHECK_DELAY_MS } from '../types/transfer-status-check';

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

    if (!jobData.walletTransactionId) {
      this.logger.error(
        `Skipped transfer payout reference=${jobData.reference}: missing walletTransactionId`,
      );
      return;
    }

    const walletTransaction = await this.walletTransactionRepo.findOne({
      where: { walletTransactionId: jobData.walletTransactionId },
    });

    if (walletTransaction?.status !== WalletTransactionStatus.PENDING) {
      this.logger.warn(
        `Skipped transfer payout reference=${jobData.reference}: status=${walletTransaction?.status}`,
      );
      return;
    }

    this.logger.log(
      `Processing transfer payout reference=${jobData.reference} provider=${provider}`,
    );

    try {
      const adapter = this.transferAdapterFactory.getTransferdapter(provider);
      const result: unknown = await adapter.processPaypout(jobData);

      this.logger.log(
        `Transfer payout submission reference=${jobData.reference} provider=${provider} response=${JSON.stringify(result)}`,
      );

      if (!adapter.isAcceptedSubmission(result)) {
        return;
      }

      await this.walletTransactionRepo.update(
        {
          walletTransactionId: jobData.walletTransactionId,
          status: WalletTransactionStatus.PENDING,
        },
        {
          status: WalletTransactionStatus.PROCESSING,
          statusCheckAttempts: 0,
          firstNotFoundAt: null,
          nextStatusCheckAt: new Date(Date.now() + FIRST_STATUS_CHECK_DELAY_MS),
        },
      );
    } catch (error) {
      this.logger.error(
        `Transfer payout submission error reference=${jobData.reference} provider=${provider}; left PENDING for status check: ${
          error instanceof Error ? error.message : error
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
