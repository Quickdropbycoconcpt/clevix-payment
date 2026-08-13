import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  VIRTUAL_ACCOUNT_CREDIT_QUEUE,
  VirtualAccountCreditJobData,
} from './virtual-account-credit.job';
import { MoneyValueConverter } from 'src/shared/converter';
import { WebhookService } from 'src/modules/webhooks/service/webhook.service';
import { ReconciliationService } from 'src/modules/reconciliation/reconciliation.service';
import { SettlementService } from 'src/modules/settlement-management/service/settlement.account.service';

@Injectable()
@Processor(VIRTUAL_ACCOUNT_CREDIT_QUEUE)
export class VirtualAccountCreditProcessor extends WorkerHost {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly settlementService: SettlementService,
    private readonly reconciliationService: ReconciliationService,
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
        feeCharged,
        collectionChannel,
      } = job.data;
      await this.settlementService.createSettlement({
        businessId,
        amount: MoneyValueConverter.fromNairaToKobo(
          credit.amount.toString(),
        ).toString(),
        reference: credit.reference,
        currency: 'NGN',
        provider,
        source: job.data.source,
        collectionChannel,
        environment,
        sourceId: dvaId,
        merchantReference,
        providerReference: credit.reference,
        feeCharged,
        metadata: {
          senderAccountNumber: credit.senderAccountNumber,
          senderName: credit.senderName,
          receivedAccountNumber: credit.receivedAccountNumber,
          narration: credit.narration,
          sessionId: credit.sessionId,
        },
      });

      const reconcile =
        await this.reconciliationService.reconcile(merchantReference);

      if (reconcile) {
        return {
          processed: true,
          merchantReference: job.data.merchantReference,
        };
      }

      /**
       * Dispatch virtual collection webhook to merchant
       */
      await this.webhookService.dispatchWebhook({
        businessId: businessId,
        type: collectionChannel,
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
