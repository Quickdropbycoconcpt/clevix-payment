import { TransactionType } from 'src/shared/encryption';
import { CollectionProvider } from './collection-adapter.types';

export type ChargePosInput = {
  stan: string;
  rrn: string;
  iccData: string;
  track2Data: string;
  cardExpiryDate: string;
  acquiringInstitutionalCode: string;
  sequenceNumber: string;
  source: TransactionType;
  serialNumber: string;
  pin: string;
  pan: string;
  accountType: string;
  reference: string;
  type: string;
  businessId: string;
  environment: string;
  amount: string;
  currency: string;
  latitude: number;
  longitude: number;
  customerEmail?: string;
};

export type ChargePosResult = {
  amount: string;
  currency: string;
  code: string;
  status: string;
  raw?: unknown;
};

export type PosWebhookEvent = {
  reference: string;
  rrn: string;
  stan: string;
  amount: string;
  settledAmount: string;
  code: string;
  status: string;
  cardBin: string;
  cardLastFour: string;
  cardType: string;
  cardBank: string;
  terminalSerialNumber: string;
  providerTerminalId: string;
  transactionDate: string;
  raw: unknown;
};

export interface PosAdapter {
  readonly provider: CollectionProvider;

  chargePos(input: ChargePosInput): Promise<ChargePosResult>;

  parsePosWebhook(body: unknown): PosWebhookEvent;
}
