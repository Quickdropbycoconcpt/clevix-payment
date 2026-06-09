import {
  CollectionProvider,
  CollectionSource,
} from './collection-adapter.types';

export type ChargePosInput = {
  businessId: string;
  environment: string;
  reference: string;
  terminalId: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  metadata?: Record<string, unknown>;
};

export type ChargePosResult = {
  provider: CollectionProvider;
  source: CollectionSource.POS;
  reference: string;
  providerReference: string;
  terminalId: string;
  amount: number;
  currency: string;
  status: string;
  raw?: unknown;
};

export interface PosAdapter {
  readonly provider: CollectionProvider;

  chargePos(input: ChargePosInput): Promise<ChargePosResult>;
}
