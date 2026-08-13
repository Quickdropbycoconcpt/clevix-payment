import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettlementAccountResolutionService } from 'src/modules/settlement-management/service/settlement-account-resolution.service';
import {
  SettlementAccountResolution,
  SettlementAccountResolver,
  SettlementAllocation,
} from 'src/modules/settlement-management/settlement-account-resolver.interface';
import { InvoicePaymentTransaction } from '../entity/invoice_transaction.entity';
import { TaxTransaction } from 'src/modules/tax-management/entity/tax-transaction.entity';
import { InvoiceItem } from '../entity/invoice_item.entity';
import { TaxCollectionMode } from 'src/shared/enum';

type SettlementAllocationInput = Omit<SettlementAllocation, 'grossAmount'> & {
  grossAmount: bigint;
};

@Injectable()
export class InvoiceSettlementAccountResolver
  implements SettlementAccountResolver, OnModuleInit
{
  constructor(
    @InjectRepository(InvoicePaymentTransaction)
    private readonly invoiceTxn: Repository<InvoicePaymentTransaction>,
    @InjectRepository(TaxTransaction)
    private readonly taxTransactionRepo: Repository<TaxTransaction>,
    private readonly resolutionService: SettlementAccountResolutionService,
  ) {}

  onModuleInit(): void {
    this.resolutionService.registerResolver(this);
  }

  async resolve(merchantRef: string): Promise<SettlementAccountResolution> {
    const attempt = await this.invoiceTxn.findOne({
      where: { invoiceTransactionReference: merchantRef },
      relations: { invoice: { items: { item: true } } },
    });

    if (!attempt) {
      return { owned: false };
    }

    const groups = new Map<string, SettlementAllocation>();
    const taxTransactions = await this.taxTransactionRepo.find({
      where: { invoiceId: attempt.invoice.invoiceId },
    });
    const taxByInvoiceItem =
      this.groupTaxTransactionsByInvoiceItem(taxTransactions);

    for (const invoiceItem of attempt.invoice.items ?? []) {
      this.addInvoiceItemAllocations(invoiceItem, taxByInvoiceItem, groups);
    }

    const allocations: SettlementAllocation[] = Array.from(groups.values());

    return { owned: true, allocations };
  }

  private groupTaxTransactionsByInvoiceItem(taxTransactions: TaxTransaction[]) {
    const taxByInvoiceItem = new Map<string, TaxTransaction[]>();

    for (const taxTransaction of taxTransactions) {
      const existing = taxByInvoiceItem.get(taxTransaction.invoiceItemId) ?? [];
      existing.push(taxTransaction);
      taxByInvoiceItem.set(taxTransaction.invoiceItemId, existing);
    }

    return taxByInvoiceItem;
  }

  private addInvoiceItemAllocations(
    invoiceItem: InvoiceItem,
    taxByInvoiceItem: Map<string, TaxTransaction[]>,
    groups: Map<string, SettlementAllocation>,
  ) {
    const settlementBankAccountId =
      invoiceItem.item?.settlementAccountId ?? null;
    const splitTaxes = this.getSplitTaxes(
      taxByInvoiceItem.get(invoiceItem.invoiceItemId) ?? [],
    );
    const splitTaxAmount = this.sumTaxAmount(splitTaxes);
    const merchantAmount = BigInt(invoiceItem.amount) - splitTaxAmount;

    this.addMerchantAllocation(groups, settlementBankAccountId, merchantAmount);
    this.addTaxAllocations(groups, splitTaxes);
  }

  private getSplitTaxes(taxTransactions: TaxTransaction[]) {
    return taxTransactions.filter((taxTransaction) =>
      this.shouldSplitTax(taxTransaction),
    );
  }

  private shouldSplitTax(taxTransaction: TaxTransaction) {
    return (
      taxTransaction.collectionMode !== TaxCollectionMode.MERCHANT_REMITTED &&
      BigInt(taxTransaction.taxAmount) > 0n &&
      Boolean(taxTransaction.settlementBankAccountId || taxTransaction.walletId)
    );
  }

  private sumTaxAmount(taxTransactions: TaxTransaction[]) {
    return taxTransactions.reduce(
      (sum, taxTransaction) => sum + BigInt(taxTransaction.taxAmount),
      0n,
    );
  }

  private addMerchantAllocation(
    groups: Map<string, SettlementAllocation>,
    settlementBankAccountId: string | null,
    merchantAmount: bigint,
  ) {
    if (merchantAmount <= 0n) {
      return;
    }

    this.addAllocation(groups, {
      settlementBankAccountId,
      grossAmount: merchantAmount,
    });
  }

  private addTaxAllocations(
    groups: Map<string, SettlementAllocation>,
    taxTransactions: TaxTransaction[],
  ) {
    for (const taxTransaction of taxTransactions) {
      this.addAllocation(groups, {
        settlementBankAccountId: taxTransaction.settlementBankAccountId,
        walletId: taxTransaction.walletId,
        deductFee: false,
        grossAmount: BigInt(taxTransaction.taxAmount),
        metadata: {
          taxTransactionId: taxTransaction.taxTransactionId,
          taxId: taxTransaction.taxId,
          collectionMode: taxTransaction.collectionMode,
          destinationType: taxTransaction.destinationType,
        },
      });
    }
  }

  /**
   * Group items by settlement account (null = no override) and sum each
   * group's gross amount, so an invoice whose items point at different
   * accounts produces one allocation per account instead of collapsing
   * to a single destination.
   */
  private addAllocation(
    groups: Map<string, SettlementAllocation>,
    allocation: SettlementAllocationInput,
  ) {
    const key = this.getAllocationKey(allocation);
    const current = groups.get(key);

    groups.set(key, {
      settlementBankAccountId: allocation.settlementBankAccountId,
      walletId: allocation.walletId,
      deductFee: allocation.deductFee,
      metadata: allocation.metadata,
      grossAmount: (
        BigInt(current?.grossAmount ?? '0') + allocation.grossAmount
      ).toString(),
    });
  }

  private getAllocationKey(allocation: SettlementAllocationInput) {
    return `${allocation.settlementBankAccountId ?? ''}:${allocation.walletId ?? ''}:${allocation.deductFee === false ? 'tax' : 'merchant'}`;
  }
}
