export type SettlementAllocation = {
  settlementBankAccountId: string | null;
  walletId?: string | null;
  deductFee?: boolean;
  metadata?: Record<string, unknown>;
  /** Gross (pre-fee) amount this allocation represents, bigint-as-string. */
  grossAmount: string;
};

export type SettlementAccountResolution =
  | { owned: false }
  | { owned: true; allocations: SettlementAllocation[] };

export interface SettlementAccountResolver {
  /**
   * Given the merchant reference a wallet credit is attached to, say
   * whether this feature owns it, and if so, how its gross amount splits
   * across settlement accounts — e.g. a checkout invoice whose items are
   * each pinned to a (possibly different) settlement account. A single
   * allocation with `settlementBankAccountId: null` means "no override,
   * fall back to the business's general BusinessSettlementConfig."
   */
  resolve(merchantRef: string): Promise<SettlementAccountResolution>;
}
