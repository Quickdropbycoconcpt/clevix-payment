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

import { TransactionSource } from 'src/shared/enum';

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
        reference: attempt.invoiceTransactionReference,
        validityTime: 2400,
        transactionSource: TransactionSource.CHECKOUT_INVOICE,
        // Only override settlement fee computation when the fee was already
        // baked into `amount` (customer-borne). When the business bears it,
        // let the settlement pipeline compute/deduct it as usual.
        feeCharged:
          feePreview.feeBearer === 'customer' ? feePreview.fee : undefined,
      },
      { businessId: invoice.businessId, environment: invoice.environment },
    );
  }
}
