import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookService } from 'src/modules/webhooks/service/webhook.service';
import { TransactionSource, TransactionStatus } from 'src/shared/enum';
import { Transactions } from 'src/modules/transactions/entity/transaction.entity';
import { ReconciliationService } from 'src/modules/reconciliation/reconciliation.service';
import { ReconciliationHandler } from 'src/modules/reconciliation/reconciliation-handler.interface';
import {
  InvoiceStatus,
  OrganisationInvoice,
} from '../entity/service_checkout_invoice.entity';
import { InvoicePaymentTransaction } from '../entity/invoice_transaction.entity';
import { TaxManagementService } from 'src/modules/tax-management/service/tax-management.service';

@Injectable()
export class InvoiceReconciliationHandler
  implements ReconciliationHandler, OnModuleInit
{
  constructor(
    @InjectRepository(OrganisationInvoice)
    private readonly invoiceRepo: Repository<OrganisationInvoice>,
    @InjectRepository(InvoicePaymentTransaction)
    private readonly invoiceTxn: Repository<InvoicePaymentTransaction>,
    private readonly webhookService: WebhookService,
    private readonly reconciliationService: ReconciliationService,
    private readonly taxManagementService: TaxManagementService,
  ) {}

  onModuleInit(): void {
    this.reconciliationService.registerHandler(this);
  }

  async handle(
    merchantRef: string,
    transaction: Transactions,
  ): Promise<boolean> {
    const attempt = await this.invoiceTxn.findOne({
      where: { invoiceTransactionReference: merchantRef },
      relations: { invoice: true },
    });

    if (!attempt) {
      return false;
    }

    attempt.transactionId = transaction.transactionId;
    attempt.paymentStatus = transaction.executionStatus;

    await this.invoiceTxn.save(attempt);

    if (transaction.executionStatus === TransactionStatus.SUCCESS) {
      attempt.invoice.status = InvoiceStatus.PAID;
      attempt.invoice.paidAt = new Date();
      await this.invoiceRepo.save(attempt.invoice);
      await this.taxManagementService.markInvoiceTaxesCollected(
        attempt.invoice.invoiceId,
        transaction.transactionId,
      );
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

    return true;
  }
}
