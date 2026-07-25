import { BadRequestException, Injectable } from '@nestjs/common';
import { PosService } from 'src/modules/Api/collection/pos/service/pos.service';
import type { ChargePosDto } from 'src/modules/Api/collection/pos/dto/charge-pos.dto';
import { PosPaymentIntentDto } from '../dto/pos-payment-intent.dto';
import { InvoicePaymentInitiator } from './invoice-payment-initiator.interface';
import { OrganisationInvoice } from '../entity/service_checkout_invoice.entity';
import {
  InvoicePaymentTransaction,
  SupportedPaymentMethod,
} from '../entity/invoice_transaction.entity';
import { InvoiceFeeService } from '../fee/invoice-fee.service';
import { validateIntent } from '../utils/validate-intent.util';

@Injectable()
export class PosInvoicePaymentInitiator implements InvoicePaymentInitiator {
  constructor(
    private readonly posService: PosService,
    private readonly feeService: InvoiceFeeService,
  ) {}

  async initiate(
    invoice: OrganisationInvoice,
    attempt: InvoicePaymentTransaction,
    intent: Record<string, any>,
  ) {
    const posIntent = await validateIntent(PosPaymentIntentDto, intent);

    const feePreview = await this.feeService.computeFee(
      invoice,
      SupportedPaymentMethod.POS,
    );

    if (BigInt(posIntent.amount) !== BigInt(feePreview.totalAmount)) {
      throw new BadRequestException(
        'Submitted amount does not match the expected total for this invoice',
      );
    }

    return this.posService.chargePos(
      {
        ...posIntent,
        amount: feePreview.totalAmount,
        currency: invoice.currencyCode,
        reference: attempt.invoicePaymentTransactionId,
        // Only override the wallet-credit fee computation when the fee was
        // already baked into `totalAmount` (customer-borne). When the
        // business bears it, let creditUserWallet compute/deduct it as usual.
        feeCharged:
          feePreview.feeBearer === 'customer' ? feePreview.fee : undefined,
      } as ChargePosDto,
      { businessId: invoice.businessId, environment: invoice.environment },
    );
  }
}
