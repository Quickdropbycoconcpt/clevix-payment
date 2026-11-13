import { Injectable } from '@nestjs/common';
import { CardPaymentAdapter } from 'src/modules/Api/collection/adapters/contracts/card-payment.adapter';
import { CollectionProvider } from 'src/modules/Api/collection/adapters/contracts/collection-adapter.types';
import {
  CardInitiationResponse,
  CardInput,
  CardOtpInput,
  CardOtpResponse,
  CardWebhookEvent,
} from 'src/modules/Api/collection/card/interface/card.interface';
import { MoneyValueConverter } from 'src/shared/converter';
import { MonnifyClient } from '../monnify.client';

type MonnifyCardWebhookPayload = {
  eventType?: string;
  eventData?: {
    transactionReference?: string;
    paymentReference?: string;
  };
};

@Injectable()
export class MonnifyCardProvider implements CardPaymentAdapter {
  readonly provider = CollectionProvider.MONNIFY;

  constructor(private readonly monnifyClient: MonnifyClient) {}

  async initiateTransaction(input: CardInput): Promise<CardInitiationResponse> {
    const customerName =
      [input.firstName, input.lastName].filter((name) => name?.trim()).join(' ') ||
      input.email;

    const { transactionReference } = await this.monnifyClient.initTransaction({
      environment: input.environment,
      amountInNaira: MoneyValueConverter.fromKoboToNaira(input.amount),
      paymentReference: input.reference,
      customerName,
      customerEmail: input.email,
      description: 'Card payment',
      paymentMethods: ['CARD'],
    });

    const charge = await this.monnifyClient.chargeCard({
      environment: input.environment,
      paymentReference: input.reference,
      transactionReference,
      cardNumber: input.cardNumber,
      expiryMonth: input.expiryDate.slice(0, 2),
      expiryYear: `20${input.expiryDate.slice(2, 4)}`,
      pin: input.pin,
      cvv: input.cvv2,
    });

    const requiredOtp = charge.status === 'OTP_AUTHORIZATION_REQUIRED';

    return {
      success: charge.status !== 'FAILED',
      code: charge.status,
      reference: input.reference,
      message: charge.otpData?.message ?? charge.message ?? charge.status,
      redirectUrl: requiredOtp ? undefined : charge.secure3dData?.redirectUrl,
      requiredOtp,
    };
  }

  async validateOtp(input: CardOtpInput): Promise<CardOtpResponse> {
    const result = await this.monnifyClient.authorizeCardOtp({
      environment: input.environment,
      paymentReference: input.reference,
      otp: input.otp?.trim(),
    });

    return {
      success: result.status === 'SUCCESS',
      code: result.status,
      message: result.message ?? result.status,
    };
  }

  incomingWebhookHandler(payload: MonnifyCardWebhookPayload): CardWebhookEvent {
    return {
      reference: payload?.eventData?.paymentReference,
      providerReference: payload?.eventData?.transactionReference,
    };
  }
}
