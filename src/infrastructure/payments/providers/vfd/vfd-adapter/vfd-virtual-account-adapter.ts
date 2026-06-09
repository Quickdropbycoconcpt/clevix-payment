import { Injectable } from '@nestjs/common';
import { CollectionProvider } from 'src/modules/Api/collection/adapters/contracts/collection-adapter.types';
import {
  CorporateAccountResponse,
  CreateCorporateStaticAccount,
  CreateIndividualStaticAccount,
  CreateVirtualAccountInput,
  CreateVirtualAccountResult,
  IndividualStaticAccountResponse,
  SimulateInwardCreditInput,
  VirtualAccountAdapter,
  VirtualAccountCreditResponse,
} from 'src/modules/Api/collection/adapters/contracts/virtual-account.adapter';
import { VfdClient } from '../vfd.client';

type VfdVirtualAccountCreditWebhook = {
  reference: string;
  amount: string | number;
  account_number: string;
  originator_account_number: string;
  originator_account_name: string;
  originator_narration: string;
  session_id: string;
};

@Injectable()
export class VfdVirtualAccountProvider implements VirtualAccountAdapter {
  readonly provider = CollectionProvider.VFD;

  constructor(private readonly vfdClient: VfdClient) {}
  async createBusinessStaticAccount(
    input: CreateCorporateStaticAccount,
  ): Promise<CorporateAccountResponse> {
    const response = await this.vfdClient.createBusinessStaticAccount(input);

    return {
      accountNumber: response.accountNumber,
      bankName: response.bankName,
      accountName: response.accountName,
    };
  }
  async createIndividualStaticAccount(
    input: CreateIndividualStaticAccount,
  ): Promise<IndividualStaticAccountResponse> {
    const response = await this.vfdClient.createIndividualStaticAccount(input);

    return {
      accountNumber: response.accountNumber,
      middleName: response.middleName,
      bankName: response.bankName,
      firstName: response.firstName,
      lastname: response.lastName,
      currentTier: response.currentTier,
    };
  }

  incomingPaymentWebhook(
    body: VfdVirtualAccountCreditWebhook,
  ): VirtualAccountCreditResponse {
    return {
      amount: Number(body.amount),
      senderAccountNumber: body.originator_account_number,
      reference: body.reference,
      sessionId: body.session_id,
      senderName: body.originator_account_name,
      receivedAccountNumber: body.account_number,
      narration: body.originator_narration,
    };
  }

  async simulateIncomingCredit(
    input: SimulateInwardCreditInput,
  ): Promise<{ message: string }> {
    await this.vfdClient.simulateInWardVirtualCredit(input);

    return {
      message: 'Incoming credit simulated successfully',
    };
  }

  async createVirtualAccount(
    input: CreateVirtualAccountInput,
  ): Promise<CreateVirtualAccountResult> {
    const response = await this.vfdClient.createVirtualAccount(input);
    return {
      accountNumber: response.accountNumber,
      reference: input.merchantReference,
      accountName: response.accountName,
      bankName: response.bankName,
    };
  }
}
