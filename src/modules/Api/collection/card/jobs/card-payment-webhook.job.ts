import { CardWebhookEvent } from '../interface/card.interface';

export const CARD_PAYMENT_WEBHOOK_QUEUE = 'CARD_PAYMENT_WEBHOOK';
export const CARD_PAYMENT_WEBHOOK_JOB = 'PROCESS_CARD_PAYMENT_WEBHOOK';

export type CardPaymentWebhookJobData = {
  provider: string;
  webhook: CardWebhookEvent;
  raw: Record<string, any>;
};
