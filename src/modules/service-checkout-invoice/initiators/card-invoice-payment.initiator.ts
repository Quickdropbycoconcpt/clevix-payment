import { BadRequestException, Injectable } from '@nestjs/common';
import { CardPaymentService } from 'src/modules/Api/collection/card/service/card-payment.service';
import { CardPaymentIntentDto } from '../dto/card-payment-intent.dto';
import { InvoicePaymentInitiator } from './invoice-payment-initiator.interface';
import { OrganisationInvoice } from '../entity/service_checkout_invoice.entity';
import {
  InvoicePaymentTransaction,
  SupportedPaymentMethod,
} from '../entity/invoice_transaction.entity';
import { InvoiceFeeService } from '../fee/invoice-fee.service';
import { validateIntent } from '../utils/validate-intent.util';

@Injectable()
export class CardInvoicePaymentInitiator implements InvoicePaymentInitiator {
  constructor(
    private readonly cardPaymentService: CardPaymentService,
    private readonly feeService: InvoiceFeeService,
  ) {}

  async initiate(
    invoice: OrganisationInvoice,
    attempt: InvoicePaymentTransaction,
    intent: Record<string, any>,
  ) {
    const cardIntent = await validateIntent(CardPaymentIntentDto, intent);

    const feePreview = await this.feeService.computeFee(
      invoice,
      SupportedPaymentMethod.CARD,
    );

    if (BigInt(cardIntent.amount) !== BigInt(feePreview.totalAmount)) {
      throw new BadRequestException(
        'Submitted amount does not match the expected total for this invoice',
      );
    }

    return this.cardPaymentService.initiateCardPayment(
      {
        amount: feePreview.totalAmount,
        reference: attempt.invoicePaymentTransactionId,
        email: cardIntent.email,
        cardNumber: cardIntent.cardNumber,
        cardPin: cardIntent.cardPin,
        cvv2: cardIntent.cvv2,
        expiryDate: cardIntent.expiryDate,
        narration: cardIntent.narration,
        feeCharged:
          feePreview.feeBearer === 'customer' ? feePreview.fee : undefined,
      },
      { businessId: invoice.businessId, environment: invoice.environment },
    );
  }
}
