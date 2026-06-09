import { LedgerEntryDirection } from 'src/shared/enum';
import {
  LedgerAccountOwnerType,
  LedgerAccountType,
} from '../enums/ledger.enums';

export type CreateBusinessLedgeAccount = {
  businessId: string;
  currency: string;
};

export type FindOrCreateLedgerAccountInput = {
  ownerId?: string | null;
  ownerType: LedgerAccountOwnerType;
  accountType: LedgerAccountType;
  currency: string;
  environment: string;
};

export type GetLedgerDerivedBalanceInput = {
  ledgerAccountId?: string;
  ownerId?: string | null;
  ownerType?: LedgerAccountOwnerType;
  accountType?: LedgerAccountType;
  currency?: string;
  environment?: string;
};

export type LedgerPostingInput = {
  reference: string;
  transactionType: string;
  description?: string;
  businessId: string;
  environment: string;
  currency: string;
  amount: number | string;
  metadata?: Record<string, unknown>;
  entries: {
    ledgerAccountId: string;
    direction: LedgerEntryDirection;
    amount: number | string;
    memo?: string;
  }[];
};
