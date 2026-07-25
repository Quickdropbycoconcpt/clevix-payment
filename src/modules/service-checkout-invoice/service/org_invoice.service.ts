import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateInvoice,
  PayInvoice,
  SelectedInvoiceItem,
} from '../interface/invoice.interface';
import { In, MoreThan, Repository } from 'typeorm';
import {
  InvoiceStatus,
  OrganisationInvoice,
  RedemptionStatus,
} from '../entity/service_checkout_invoice.entity';
import {
  InvoicePaymentTransaction,
  SupportedPaymentMethod,
} from '../entity/invoice_transaction.entity';
import { InvoiceItem } from '../entity/invoice_item.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ServiceCheckout } from 'src/modules/service-checkout/service/service-checkout.service';
import { InvoicePaymentInitiatorFactory } from '../initiators/invoice-payment-initiator.factory';
import { OrganizationService } from 'src/modules/service-checkout/entity/service_definition.entity';
import {
  FormType,
  OrganisationCustomForm,
} from 'src/modules/service-checkout/entity/service_payment_form.entity';
import * as Crypto from 'node:crypto';
import { isEmail } from 'class-validator';
import { InvoiceReconciliationService } from '../reconciliation/invoice-reconciliation.service';
import { WebhookService } from 'src/modules/webhooks/service/webhook.service';
import { TransactionSource, TransactionStatus } from 'src/shared/enum';
import { InvoiceFeeService } from '../fee/invoice-fee.service';
import { Businesses } from 'src/modules/businesses/entity/business.entity';
import {
  INVOICE_ACTIVE_PAYMENT_ATTEMPT_WINDOW_MS,
  INVOICE_MAX_REFERENCE_GENERATION_ATTEMPTS,
  INVOICE_OPTION_BASED_FORM_TYPES,
} from 'src/shared/constants/invoice.constants';

@Injectable()
export class OrganisationInvoiceService {
  constructor(
    @InjectRepository(OrganisationInvoice)
    private readonly invoiceRepo: Repository<OrganisationInvoice>,
    private readonly serviceService: ServiceCheckout,
    private readonly initiatorFactory: InvoicePaymentInitiatorFactory,
    private readonly reconciliationService: InvoiceReconciliationService,
    private readonly webhookService: WebhookService,
    private readonly feeService: InvoiceFeeService,
    @InjectRepository(Businesses)
    private readonly businessRepo: Repository<Businesses>,
  ) {}

  async createInvoice(input: CreateInvoice) {
    const service = await this.serviceService.getServiceById(input.serviceId);

    if (!service.isActive) {
      throw new BadRequestException('This service is not currently available');
    }

    const business = await this.businessRepo.findOne({
      where: { businessId: service.businessId },
    });

    this.validateFormDetails(service.customForms ?? [], input.formDetails);

    const paymentRule = service.paymentrule;
    if (!paymentRule) {
      throw new BadRequestException(
        'Payment rules are not configured for this service',
      );
    }

    if (!service.customerPayForListOfItems && input.items.length !== 1) {
      throw new BadRequestException(
        'This service only accepts payment for a single item',
      );
    }

    const resolvedItems = this.resolveInvoiceItems(service, input.items);
    const amount = resolvedItems
      .reduce((total, item) => total + BigInt(item.amount), 0n)
      .toString();

    const submittedTotal = input.formDetails?.totalAmount;

    if (submittedTotal !== undefined) {
      let submittedTotalAmount: bigint;

      try {
        submittedTotalAmount = BigInt(submittedTotal);
      } catch {
        throw new BadRequestException(
          'totalAmount must be an integer amount in the smallest currency unit',
        );
      }

      if (submittedTotalAmount !== BigInt(amount)) {
        throw new BadRequestException(
          'totalAmount does not match the sum of selected items',
        );
      }
    }

    const expiresAt = paymentRule.invoiceExpiryMinutes
      ? new Date(Date.now() + paymentRule.invoiceExpiryMinutes * 60 * 1000)
      : null;

    let invoice: OrganisationInvoice | undefined;

    for (let attempt = 1; attempt <= INVOICE_MAX_REFERENCE_GENERATION_ATTEMPTS; attempt++) {
      try {
        invoice = await this.invoiceRepo.manager.transaction(
          async (manager) => {
            const invoiceRepo = manager.getRepository(OrganisationInvoice);
            const invoiceItemRepo = manager.getRepository(InvoiceItem);

            if (input.merchantReference) {
              const existing = await invoiceRepo.findOne({
                where: {
                  businessId: service.businessId,
                  merchantReference: input.merchantReference,
                },
                relations: { items: true },
              });

              if (existing) {
                return existing;
              }
            }

            const invoiceEntity = invoiceRepo.create({
              businessId: service.businessId,
              environment: service.environment,
              serviceId: input.serviceId,
              formDetails: input.formDetails,
              amount,
              currencyCode: paymentRule.currencyCode,
              status: InvoiceStatus.PENDING,
              expiresAt,
              reference: this.generateInvoiceReference(),
              merchantReference: input.merchantReference,
              redemptionStatus: service.requiredRedemption
                ? RedemptionStatus.NOT_USED
                : null,
            });

            const savedInvoice = await invoiceRepo.save(invoiceEntity);

            const invoiceItems = resolvedItems.map((resolved) =>
              invoiceItemRepo.create({
                businessId: savedInvoice.businessId,
                environment: savedInvoice.environment,
                amount: resolved.amount,
                invoiceId: savedInvoice.invoiceId,
                itemId: resolved.itemId,
              }),
            );

            await invoiceItemRepo.save(invoiceItems);

            return savedInvoice;
          },
        );

        break;
      } catch (error) {
        if (
          this.isReferenceCollision(error) &&
          attempt < INVOICE_MAX_REFERENCE_GENERATION_ATTEMPTS
        ) {
          continue;
        }

        if (input.merchantReference && this.isUniqueViolation(error)) {
          const existing = await this.invoiceRepo.findOneOrFail({
            where: {
              businessId: service.businessId,
              merchantReference: input.merchantReference,
            },
            relations: { items: true },
          });

          return this.buildInvoiceResponse(
            existing,
            service,
            business,
            existing.items ?? [],
          );
        }

        throw error;
      }
    }

    if (!invoice) {
      throw new BadRequestException(
        'Failed to generate a unique invoice reference, please try again',
      );
    }

    if (invoice.items) {
      return this.buildInvoiceResponse(
        invoice,
        service,
        business,
        invoice.items,
      );
    }

    await this.webhookService.dispatchWebhook({
      businessId: invoice.businessId,
      environment: invoice.environment,
      type: TransactionSource.CHECKOUT_INVOICE,
      payload: {
        reference: invoice.reference,
        merchantReference: invoice.merchantReference,
        status: invoice.status,
        amount: invoice.amount,
        currencyCode: invoice.currencyCode,
        serviceId: invoice.serviceId,
        expiresAt: invoice.expiresAt,
      },
    });

    return this.buildInvoiceResponse(invoice, service, business, resolvedItems);
  }

  private buildInvoiceResponse(
    invoice: OrganisationInvoice,
    service: OrganizationService,
    business: Businesses | null,
    items: { itemId: string; amount: string }[],
  ) {
    return {
      invoiceId: invoice.invoiceId,
      reference: invoice.reference,
      merchantReference: invoice.merchantReference,
      amount: invoice.amount,
      currencyCode: invoice.currencyCode,
      status: invoice.status,
      expiresAt: invoice.expiresAt,
      createdAt: invoice.createdAt,
      business: {
        businessId: service.businessId,
        businessName: business?.businessName ?? null,
      },
      service: {
        serviceId: service.serviceId,
        serviceName: service.serviceName,
      },
      items: items.map((item) => ({
        itemId: item.itemId,
        name: service.items?.find(
          (serviceItem) => serviceItem.itemId === item.itemId,
        )?.name,
        amount: item.amount,
      })),
    };
  }

  private resolveInvoiceItems(
    service: OrganizationService,
    selectedItems: SelectedInvoiceItem[],
  ) {
    return selectedItems.map((selection) => {
      const item = service.items?.find(
        (serviceItem) => serviceItem.itemId === selection.itemId,
      );

      if (!item) {
        throw new BadRequestException(
          `Item ${selection.itemId} does not belong to this service`,
        );
      }

      const amount = item.fixedPrice ? item.fixedAmount : selection.amount;

      if (!amount) {
        throw new BadRequestException(
          `Amount is required for item ${item.name}`,
        );
      }

      return { itemId: item.itemId, amount };
    });
  }

  private generateInvoiceReference(): string {
    const digits = () => Crypto.randomInt(0, 10000).toString().padStart(4, '0');
    const letters = () =>
      Array.from({ length: 4 }, () =>
        String.fromCharCode(65 + Crypto.randomInt(0, 26)),
      ).join('');

    return `${digits()}-${letters()}-${digits()}`;
  }

  private isReferenceCollision(error: unknown): boolean {
    return (
      this.isUniqueViolation(error) &&
      typeof (error as { detail?: string }).detail === 'string' &&
      (error as { detail: string }).detail.includes('(reference)')
    );
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === '23505'
    );
  }

  async previewFee(reference: string, method: SupportedPaymentMethod) {
    const invoice = await this.invoiceRepo.findOne({
      where: { reference },
      relations: { service: { paymentrule: true } },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.feeService.computeFee(invoice, method);
  }

  async payInvoice(input: PayInvoice) {
    const attempt = await this.invoiceRepo.manager.transaction(
      async (manager) => {
        const invoiceRepo = manager.getRepository(OrganisationInvoice);
        const txnRepo = manager.getRepository(InvoicePaymentTransaction);

        const lockedInvoice = await invoiceRepo.findOne({
          where: { reference: input.reference },
          lock: { mode: 'pessimistic_write' },
        });

        if (!lockedInvoice) {
          throw new NotFoundException('Invoice not found');
        }

        if (lockedInvoice.status !== InvoiceStatus.PENDING) {
          throw new BadRequestException(
            `Invoice is ${lockedInvoice.status} and cannot be paid`,
          );
        }

        // if (lockedInvoice.expiresAt && lockedInvoice.expiresAt < new Date()) {
        //   throw new BadRequestException('Invoice has expired');
        // }

        const activeAttempt = await txnRepo.findOne({
          where: {
            invoice: { reference: lockedInvoice.reference },
            paymentStatus: In([
              TransactionStatus.INITIATED,
              TransactionStatus.PENDING,
              TransactionStatus.PROCESSING,
              TransactionStatus.SUCCESS,
            ]),
            createdAt: MoreThan(
              new Date(Date.now() - INVOICE_ACTIVE_PAYMENT_ATTEMPT_WINDOW_MS),
            ),
          },
        });

        if (activeAttempt) {
          throw new BadRequestException(
            'A payment attempt is already in progress for this invoice',
          );
        }

        return txnRepo.save(
          txnRepo.create({
            businessId: lockedInvoice.businessId,
            environment: lockedInvoice.environment,
            method: input.method,
            invoice: lockedInvoice,
          }),
        );
      },
    );

    const invoice = await this.invoiceRepo.findOneOrFail({
      where: { reference: input.reference },
      relations: { service: { paymentrule: true } },
    });

    const initiator = this.initiatorFactory.getInitiator(input.method);
    const result = await initiator.initiate(invoice, attempt, input.intent);

    await this.reconciliationService.reconcile(
      attempt.invoicePaymentTransactionId,
    );

    return {
      invoicePaymentTransactionId: attempt.invoicePaymentTransactionId,
      ...result,
    };
  }

  private validateFormDetails(
    forms: OrganisationCustomForm[],
    formDetails: Record<string, any>,
  ) {
    for (const form of forms) {
      const value = formDetails?.[form.formKey];
      const hasValue = value !== undefined && value !== null && value !== '';

      if (form.required === 'Y' && !hasValue) {
        throw new BadRequestException(`${form.formLabel} is required`);
      }

      if (!hasValue) {
        continue;
      }

      if (INVOICE_OPTION_BASED_FORM_TYPES.includes(form.formType)) {
        const validOptions = (form.options ?? []).map((option) => option.value);
        const submittedValues = Array.isArray(value) ? value : [value];
        const isValid = submittedValues.every((submitted) =>
          validOptions.includes(submitted),
        );

        if (!isValid) {
          throw new BadRequestException(
            `Invalid value for ${form.formLabel}. Expected one of: ${validOptions.join(', ')}`,
          );
        }

        continue;
      }

      if (form.formType === FormType.EMAIL && !isEmail(value)) {
        throw new BadRequestException(
          `${form.formLabel} must be a valid email`,
        );
      }

      if (form.formType === FormType.NUMBER && Number.isNaN(Number(value))) {
        throw new BadRequestException(`${form.formLabel} must be a number`);
      }

      if (form.formType === FormType.DATE && Number.isNaN(Date.parse(value))) {
        throw new BadRequestException(`${form.formLabel} must be a valid date`);
      }
    }
  }
}
