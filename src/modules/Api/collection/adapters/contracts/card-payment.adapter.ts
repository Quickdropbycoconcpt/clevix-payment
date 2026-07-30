import {
  CardInitiationResponse,
  CardInput,
  CardOtpInput,
  CardOtpResponse,
  CardWebhookEvent,
} from '../../card/interface/card.interface';
import { CollectionProvider } from './collection-adapter.types';

export interface CardPaymentAdapter {
  readonly provider: CollectionProvider;
  initiateTransaction(input: CardInput): Promise<CardInitiationResponse>;

  validateOtp?(input: CardOtpInput): Promise<CardOtpResponse>;

  incomingWebhookHandler(payload: unknown): CardWebhookEvent;
}
