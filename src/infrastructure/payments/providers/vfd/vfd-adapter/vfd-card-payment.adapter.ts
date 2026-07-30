import { CardPaymentAdapter } from 'src/modules/Api/collection/adapters/contracts/card-payment.adapter';
import { CollectionProvider } from 'src/modules/Api/collection/adapters/contracts/collection-adapter.types';
import { VfdClient } from '../vfd.client';
import {
  CardInitiationResponse,
  CardInput,
  CardOtpInput,
  CardOtpResponse,
  CardWebhookEvent,
} from 'src/modules/Api/collection/card/interface/card.interface';
import { Injectable } from '@nestjs/common';

type VfdCardWebhookPayload = {
  status?: string;
  message?: string;
  data?: {
    reference?: string;
    paymentReference?: string;
    amountCollected?: string;
    amountCredited?: string;
  };
};

@Injectable()
export class VfdCardProvider implements CardPaymentAdapter {
  readonly provider = CollectionProvider.VFD;

  constructor(private readonly vfdClient: VfdClient) {}

  async initiateTransaction(input: CardInput): Promise<CardInitiationResponse> {
    return this.vfdClient.initiateCardTransaction(input);
  }

  async validateOtp(input: CardOtpInput): Promise<CardOtpResponse> {
    return this.vfdClient.validateCardotp(input);
  }

  incomingWebhookHandler(payload: VfdCardWebhookPayload): CardWebhookEvent {
    return {
      reference: payload?.data?.reference,
      providerReference: payload?.data?.paymentReference,
    };
  }
}
