import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  VIRTUAL_ACCOUNT_CREDIT_QUEUE,
  VirtualAccountCreditJobData,
} from './virtual-account-credit.job';
import { WalletService } from 'src/modules/wallets/service/wallets.service';
import { TransactionSource } from 'src/shared/enum';
import { MoneyValueConverter } from 'src/shared/converter';
import { WebhookService } from 'src/modules/webhooks/service/webhook.service';

@Injectable()
@Processor(VIRTUAL_ACCOUNT_CREDIT_QUEUE)
export class VirtualAccountCreditProcessor extends WorkerHost {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly walletService: WalletService,
  ) {
    super();
  }
  private readonly logger = new Logger(VirtualAccountCreditProcessor.name);

  async process(job: Job<VirtualAccountCreditJobData>) {
    this.logger.log(
      `Processing virtual account credit job ${job.id} for ${job.data.merchantReference}`,
    );
    try {
      const {
        businessId,
        environment,
        credit,
        provider,
        dvaId,
        merchantReference,
      } = job.data;
      await this.walletService.creditUserWallet({
        businessId,
        amount: MoneyValueConverter.fromNairaToKobo(
          credit.amount.toString(),
        ).toString(),
        reference: credit.reference,
        currency: 'NGN',
        provider,
        source: TransactionSource.VIRTUAL_ACCOUNT_COLLECTION,
        environment,
        sourceId: dvaId,
        merchantReference,
        providerReference: credit.reference,
        metadata: {
          senderAccountNumber: credit.senderAccountNumber,
          senderName: credit.senderName,
          receivedAccountNumber: credit.receivedAccountNumber,
          narration: credit.narration,
          sessionId: credit.sessionId,
        },
      });
      /**
       * Dispatch virtual collection webhook to merchant
       */
      await this.webhookService.dispatchWebhook({
        businessId: businessId,
        type: TransactionSource.VIRTUAL_ACCOUNT_COLLECTION,
        environment,
        payload: {
          senderAccountNumber: credit.senderAccountNumber,
          senderName: credit.senderName,
          reference: merchantReference,
          receivedAccountNumber: credit.receivedAccountNumber,
          narration: credit.narration,
          sessionId: credit.sessionId,
          amount: MoneyValueConverter.fromNairaToKobo(
            credit.amount.toString(),
          ).toString(),
        },
      });
      return {
        processed: true,
        merchantReference: job.data.merchantReference,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process virtual account credit job ${job.id} for ${job.data.merchantReference}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
