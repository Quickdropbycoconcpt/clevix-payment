import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionService } from 'src/modules/transactions/service/transaction.service';
import { WebhookService } from 'src/modules/webhooks/service/webhook.service';
import { TransactionSource, TransactionStatus } from 'src/shared/enum';
import {
  InvoiceStatus,
  OrganisationInvoice,
} from '../entity/service_checkout_invoice.entity';
import { InvoicePaymentTransaction } from '../entity/invoice_transaction.entity';

@Injectable()
export class InvoiceReconciliationService {
  constructor(
    @InjectRepository(OrganisationInvoice)
    private readonly invoiceRepo: Repository<OrganisationInvoice>,
    @InjectRepository(InvoicePaymentTransaction)
    private readonly invoiceTxn: Repository<InvoicePaymentTransaction>,
    private readonly transactionService: TransactionService,
    private readonly webhookService: WebhookService,
  ) {}

  async reconcile(invoiceTxnId: string) {
    const attempt = await this.invoiceTxn.findOne({
      where: { invoicePaymentTransactionId: invoiceTxnId },
      relations: { invoice: true },
    });

    if (!attempt) {
      return;
    }

    const transaction =
      await this.transactionService.getTransactionByMerchantRef(invoiceTxnId);

    if (!transaction) {
      return;
    }

    attempt.transactionId = transaction.transactionId;
    attempt.paymentStatus = transaction.executionStatus;

    await this.invoiceTxn.save(attempt);

    if (transaction.executionStatus === TransactionStatus.SUCCESS) {
      attempt.invoice.status = InvoiceStatus.PAID;
      attempt.invoice.paidAt = new Date();

      await this.invoiceRepo.save(attempt.invoice);

      await this.webhookService.dispatchWebhook({
        businessId: attempt.invoice.businessId,
        environment: attempt.invoice.environment,
        type: TransactionSource.CHECKOUT_INVOICE,
        payload: {
          reference: attempt.invoice.reference,
          status: attempt.invoice.status,
          amount: attempt.invoice.amount,
          currencyCode: attempt.invoice.currencyCode,
          paidAt: attempt.invoice.paidAt,
          serviceId: attempt.invoice.serviceId,
        },
      });
    }
  }
}
