import { BadRequestException, Injectable } from '@nestjs/common';
import * as Crypto from 'node:crypto';
import { CollectionProvider } from 'src/modules/Api/collection/adapters/contracts/collection-adapter.types';
import {
  CorporateAccountResponse,
  CreateCorporateStaticAccount,
  CreateIndividualStaticAccount,
  CreateVirtualAccountInput,
  CreateVirtualAccountResult,
  IndividualStaticAccountResponse,
  VirtualAccountAdapter,
  VirtualAccountCreditResponse,
} from 'src/modules/Api/collection/adapters/contracts/virtual-account.adapter';
import { MoneyValueConverter } from 'src/shared/converter';
import { MonnifyClient } from '../monnify.client';

type MonnifyTransactionWebhook = {
  eventType?: string;
  eventData?: {
    transactionReference?: string;
    paymentReference?: string;
    amountPaid?: string | number;
    paymentDescription?: string;
    destinationAccountInformation?: { accountNumber?: string };
    paymentSourceInformation?: {
      accountName?: string;
      accountNumber?: string;
      sessionId?: string;
    }[];
  };
};

@Injectable()
export class MonnifyVirtualAccountProvider implements VirtualAccountAdapter {
  readonly provider = CollectionProvider.MONNIFY;

  constructor(private readonly monnifyClient: MonnifyClient) {}

  async createVirtualAccount(
    input: CreateVirtualAccountInput,
  ): Promise<CreateVirtualAccountResult> {
    const customerEmail = this.requireEmail(input.customerEmail);

    const { transactionReference } = await this.monnifyClient.initTransaction({
      environment: input.environment,
      amountInNaira: MoneyValueConverter.fromKoboToNaira(input.amount),
      paymentReference: input.reference,
      customerName: input.accountName,
      customerEmail,
      description: `Payment to ${input.accountName}`,
      paymentMethods: ['ACCOUNT_TRANSFER'],
    });

    const account = await this.monnifyClient.initBankTransferPayment(
      input.environment,
      transactionReference,
    );

    return {
      accountNumber: account.accountNumber,
      reference: input.merchantReference,
      accountName: account.accountName,
      bankName: account.bankName,
    };
  }

  async createIndividualStaticAccount(
    input: CreateIndividualStaticAccount,
  ): Promise<IndividualStaticAccountResponse> {
    const customerName = `${input.firstName} ${input.lastName}`.trim();

    const account = await this.monnifyClient.createReservedAccount({
      environment: input.environment,
      accountReference: `CLV-${Crypto.randomUUID()}`,
      accountName: customerName,
      customerName,
      customerEmail: this.requireEmail(input.customerEmail),
      bvn: input.bvn,
      nin: input.nin,
    });

    return {
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankName: account.bankName,
      firstName: input.firstName,
      lastname: input.lastName,
    };
  }

  async createBusinessStaticAccount(
    input: CreateCorporateStaticAccount,
  ): Promise<CorporateAccountResponse> {
    const account = await this.monnifyClient.createReservedAccount({
      environment: input.environment,
      accountReference: `CLV-${Crypto.randomUUID()}`,
      accountName: input.companyName,
      customerName: input.companyName,
      customerEmail: this.requireEmail(input.customerEmail),
      bvn: input.bvn,
      nin: input.nin,
    });

    return {
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankName: account.bankName,
    };
  }

  async simulateIncomingCredit(): Promise<{ message: string }> {
    throw new BadRequestException(
      'Monnify does not support simulating incoming credits',
    );
  }

  incomingPaymentWebhook(
    body: MonnifyTransactionWebhook,
  ): VirtualAccountCreditResponse {
    const data = body?.eventData ?? {};
    const source = data.paymentSourceInformation?.[0] ?? {};

    return {
      amount: Number(data.amountPaid),
      reference: data.paymentReference,
      senderAccountNumber: source.accountNumber,
      senderName: source.accountName,
      receivedAccountNumber: data.destinationAccountInformation?.accountNumber,
      narration: data.paymentDescription,
      sessionId: source.sessionId,
    };
  }

  private requireEmail(email?: string): string {
    if (!email?.trim()) {
      throw new BadRequestException('Monnify requires a customer email');
    }

    return email.trim();
  }
}
