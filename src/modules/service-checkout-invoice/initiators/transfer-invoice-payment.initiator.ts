import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VirtualAccountsService } from 'src/modules/Api/collection/virtual-accounts/service/virtual-accounts.service';
import { Businesses } from 'src/modules/businesses/entity/business.entity';
import { TransferPaymentIntentDto } from '../dto/transfer-payment-intent.dto';
import { InvoicePaymentInitiator } from './invoice-payment-initiator.interface';
import { OrganisationInvoice } from '../entity/service_checkout_invoice.entity';
import {
  InvoicePaymentTransaction,
  SupportedPaymentMethod,
} from '../entity/invoice_transaction.entity';
import { InvoiceFeeService } from '../fee/invoice-fee.service';
import { validateIntent } from '../utils/validate-intent.util';
import {
  VIRTUAL_ACCOUNT_DEFAULT_VALIDITY_MINUTES,
  VIRTUAL_ACCOUNT_MAX_VALIDITY_MINUTES,
  VIRTUAL_ACCOUNT_MIN_VALIDITY_MINUTES,
} from 'src/shared/constants/invoice.constants';

@Injectable()
export class TransferInvoicePaymentInitiator implements InvoicePaymentInitiator {
  constructor(
    private readonly virtualAccountsService: VirtualAccountsService,
    private readonly feeService: InvoiceFeeService,
    @InjectRepository(Businesses)
    private readonly businessRepo: Repository<Businesses>,
  ) {}

  async initiate(
    invoice: OrganisationInvoice,
    attempt: InvoicePaymentTransaction,
    intent: Record<string, any>,
  ) {
    await validateIntent(TransferPaymentIntentDto, intent);

    const business = await this.businessRepo.findOne({
      where: { businessId: invoice.businessId },
    });

    const feePreview = await this.feeService.computeFee(
      invoice,
      SupportedPaymentMethod.TRANSFER,
    );

    return this.virtualAccountsService.generateDynamicVirtualAccount(
      {
        accountName: business?.businessName ?? invoice.reference,
        amount: feePreview.totalAmount,
        reference: attempt.invoicePaymentTransactionId,
        validityTime: this.resolveValidityMinutes(invoice.expiresAt),
        // Only override the eventual wallet-credit fee computation when the
        // fee was already baked into `amount` (customer-borne). When the
        // business bears it, let creditUserWallet compute/deduct it as usual.
        feeCharged:
          feePreview.feeBearer === 'customer' ? feePreview.fee : undefined,
      },
      { businessId: invoice.businessId, environment: invoice.environment },
    );
  }

  private resolveValidityMinutes(expiresAt: Date | null): number {
    if (!expiresAt) {
      return VIRTUAL_ACCOUNT_DEFAULT_VALIDITY_MINUTES;
    }

    const minutesRemaining = Math.floor(
      (expiresAt.getTime() - Date.now()) / 60000,
    );

    return Math.min(
      VIRTUAL_ACCOUNT_MAX_VALIDITY_MINUTES,
      Math.max(VIRTUAL_ACCOUNT_MIN_VALIDITY_MINUTES, minutesRemaining),
    );
  }
}
