import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  CARD_PAYMENT_WEBHOOK_JOB,
  CARD_PAYMENT_WEBHOOK_QUEUE,
  CardPaymentWebhookJobData,
} from './card-payment-webhook.job';

@Injectable()
export class CardPaymentWebhookQueue {
  constructor(
    @InjectQueue(CARD_PAYMENT_WEBHOOK_QUEUE)
    private readonly queue: Queue<CardPaymentWebhookJobData>,
  ) {}

  async addWebhookJob(data: CardPaymentWebhookJobData) {
    return this.queue.add(CARD_PAYMENT_WEBHOOK_JOB, data, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
      jobId: data.webhook.providerReference || data.webhook.reference,
    });
  }
}
