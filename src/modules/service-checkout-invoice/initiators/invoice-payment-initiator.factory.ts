import { BadRequestException, Injectable } from '@nestjs/common';
import { SupportedPaymentMethod } from '../entity/invoice_transaction.entity';
import { InvoicePaymentInitiator } from './invoice-payment-initiator.interface';
import { CardInvoicePaymentInitiator } from './card-invoice-payment.initiator';
import { PosInvoicePaymentInitiator } from './pos-invoice-payment.initiator';
import { TransferInvoicePaymentInitiator } from './transfer-invoice-payment.initiator';

@Injectable()
export class InvoicePaymentInitiatorFactory {
  private readonly initiators = new Map<
    SupportedPaymentMethod,
    InvoicePaymentInitiator
  >();

  constructor(
    private readonly posInitiator: PosInvoicePaymentInitiator,
    private readonly transferInitiator: TransferInvoicePaymentInitiator,
    private readonly cardInitiator: CardInvoicePaymentInitiator,
  ) {
    this.initiators.set(SupportedPaymentMethod.POS, this.posInitiator);
    this.initiators.set(
      SupportedPaymentMethod.TRANSFER,
      this.transferInitiator,
    );
    this.initiators.set(SupportedPaymentMethod.CARD, this.cardInitiator);
  }

  getInitiator(method: SupportedPaymentMethod): InvoicePaymentInitiator {
    const initiator = this.initiators.get(method);

    if (!initiator) {
      throw new BadRequestException(`Unsupported payment method: ${method}`);
    }

    return initiator;
  }
}
