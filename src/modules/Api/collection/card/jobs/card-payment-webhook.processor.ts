import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { CardTransactions } from '../entity/card-transactions.entity';
import {
  CARD_PAYMENT_WEBHOOK_QUEUE,
  CardPaymentWebhookJobData,
} from './card-payment-webhook.job';
import { Repository } from 'typeorm';
import { TransactionSource, TransactionStatus } from 'src/shared/enum';
import { TransactionService } from 'src/modules/transactions/service/transaction.service';
import { Transactions } from 'src/modules/transactions/entity/transaction.entity';
import { WalletService } from 'src/modules/wallets/service/wallets.service';
import { ReconciliationService } from 'src/modules/reconciliation/reconciliation.service';
import { WebhookService } from 'src/modules/webhooks/service/webhook.service';

@Injectable()
@Processor(CARD_PAYMENT_WEBHOOK_QUEUE)
export class CardPaymentWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(CardPaymentWebhookProcessor.name);

  constructor(
    @InjectRepository(CardTransactions)
    private readonly cardTransactionRepo: Repository<CardTransactions>,
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    private readonly reconciliationService: ReconciliationService,
    private readonly webhookService: WebhookService,
  ) {
    super();
  }

  async process(job: Job<CardPaymentWebhookJobData>) {
    const { provider, webhook, raw } = job.data;

    this.logger.log(
      `Processing card webhook job ${job.id} for ${webhook.reference}`,
    );

    try {
      const transaction =
        await this.transactionService.getTransactionBySystemReference(
          webhook.reference,
        );

      if (!transaction) {
        throw new BadRequestException('Card transaction not found');
      }

      const cardTransaction = await this.resolveCardTransaction(
        transaction,
        webhook.reference,
      );

      if (
        cardTransaction?.status === TransactionStatus.SUCCESS &&
        transaction.executionStatus === TransactionStatus.SUCCESS
      ) {
        return {
          processed: true,
          duplicate: true,
          reference: webhook.reference,
          providerReference: webhook.providerReference,
        };
      }

      const amount = transaction.expectedAmount;
      const merchantReference =
        transaction.merchantReference ?? webhook.reference;

      const processedTransaction = await this.walletService.creditUserWallet({
        businessId: transaction.businessId,
        environment: transaction.environment,
        currency: transaction.currency,
        provider,
        source: TransactionSource.DEBIT_CARD_COLLECTION,
        amount,
        reference: transaction.reference,
        sourceId: transaction.sourceId,
        merchantReference,
        providerReference: webhook.providerReference,
        feeCharged: cardTransaction?.feeCharged,
        metadata: {
          providerWebhook: raw,
        },
      });

      if (cardTransaction) {
        await this.cardTransactionRepo.update(
          { cardTransactionId: cardTransaction.cardTransactionId },
          { status: TransactionStatus.SUCCESS },
        );
      }

      await this.reconciliationService.reconcile(merchantReference);

      await this.webhookService.dispatchWebhook({
        businessId: transaction.businessId,
        environment: transaction.environment,
        transactionId: processedTransaction.transactionId,
        type: TransactionSource.DEBIT_CARD_COLLECTION,
        payload: {
          reference: merchantReference,
          providerReference: webhook.providerReference,
          amount,
          status: TransactionStatus.SUCCESS,
        },
      });

      return {
        processed: true,
        reference: merchantReference,
        providerReference: webhook.providerReference,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process card webhook job ${job.id} for ${webhook.reference}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private async resolveCardTransaction(
    transaction: Transactions,
    reference: string,
  ): Promise<CardTransactions | null> {
    if (transaction.sourceId) {
      const cardTransaction = await this.cardTransactionRepo.findOne({
        where: { cardTransactionId: transaction.sourceId },
      });

      if (cardTransaction) {
        return cardTransaction;
      }
    }

    return this.cardTransactionRepo.findOne({
      where: { reference },
    });
  }

}
