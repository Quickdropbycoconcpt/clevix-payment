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

@Injectable()
export class InvoiceSettlementAccountResolver
  implements SettlementAccountResolver, OnModuleInit
{
  constructor(
    @InjectRepository(InvoicePaymentTransaction)
    private readonly invoiceTxn: Repository<InvoicePaymentTransaction>,
    private readonly resolutionService: SettlementAccountResolutionService,
  ) {}

  onModuleInit(): void {
    this.resolutionService.registerResolver(this);
  }

  async resolve(merchantRef: string): Promise<SettlementAccountResolution> {
    const attempt = await this.invoiceTxn.findOne({
      where: { invoicePaymentTransactionId: merchantRef },
      relations: { invoice: { items: { item: true } } },
    });

    if (!attempt) {
      return { owned: false };
    }

    /**
     * Group items by settlement account (null = no override) and sum each
     * group's gross amount, so an invoice whose items point at different
     * accounts produces one allocation per account instead of collapsing
     * to a single destination.
     */
    const groups = new Map<string | null, bigint>();

    for (const invoiceItem of attempt.invoice.items ?? []) {
      const settlementBankAccountId =
        invoiceItem.item?.settlementAccountId ?? null;
      const current = groups.get(settlementBankAccountId) ?? 0n;
      groups.set(
        settlementBankAccountId,
        current + BigInt(invoiceItem.amount),
      );
    }

    const allocations: SettlementAllocation[] = Array.from(
      groups.entries(),
    ).map(([settlementBankAccountId, grossAmount]) => ({
      settlementBankAccountId,
      grossAmount: grossAmount.toString(),
    }));

    return { owned: true, allocations };
  }
}
