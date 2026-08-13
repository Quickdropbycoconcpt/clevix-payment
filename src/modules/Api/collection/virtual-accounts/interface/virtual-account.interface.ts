import { CollectionProvider } from '../../adapters/contracts/collection-adapter.types';

export type CreateDynamicVirtualAccountInput = {
  provider?: CollectionProvider;

  accountName: string;

  customerEmail?: string;

  amount: string;

  reference: string;

  validityTime: number;

  feeCharged?: string;
};
