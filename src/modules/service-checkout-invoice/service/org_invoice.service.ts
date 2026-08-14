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
import { EntityManager, In, MoreThan, Repository } from 'typeorm';
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
import { ReconciliationService } from 'src/modules/reconciliation/reconciliation.service';
import { WebhookService } from 'src/modules/webhooks/service/webhook.service';
import {
  TaxPayer,
  TransactionSource,
  TransactionStatus,
} from 'src/shared/enum';
import { InvoiceFeeService } from '../fee/invoice-fee.service';
import { Businesses } from 'src/modules/businesses/entity/business.entity';
import {
  INVOICE_ACTIVE_PAYMENT_ATTEMPT_WINDOW_MS,
  INVOICE_MAX_REFERENCE_GENERATION_ATTEMPTS,
  INVOICE_OPTION_BASED_FORM_TYPES,
} from 'src/shared/constants/invoice.constants';
import { TaxManagementService } from 'src/modules/tax-management/service/tax-management.service';
import { generateRrn } from 'src/shared/utils';

type ResolvedInvoiceItem = {
  itemId: string;
  amount: string;
  baseAmount: string;
  taxAmount: string;
  taxId: string | null;
};

@Injectable()
export class OrganisationInvoiceService {
  constructor(
    @InjectRepository(OrganisationInvoice)
    private readonly invoiceRepo: Repository<OrganisationInvoice>,
    private readonly serviceService: ServiceCheckout,
    private readonly initiatorFactory: InvoicePaymentInitiatorFactory,
    private readonly reconciliationService: ReconciliationService,
    private readonly webhookService: WebhookService,
    private readonly feeService: InvoiceFeeService,
    @InjectRepository(Businesses)
    private readonly businessRepo: Repository<Businesses>,
    private readonly taxManagementService: TaxManagementService,
  ) {}

  async createInvoice(input: CreateInvoice) {
    const service = await this.serviceService.getServiceById(input.serviceId);

    this.validateServiceForInvoice(service, input);

    const business = await this.businessRepo.findOne({
      where: { businessId: service.businessId },
    });

    const formDetails = input.formDetails;

    this.validateFormDetails(service.customForms ?? [], formDetails);

    const paymentRule = this.getInvoicePaymentRule(service);
    const resolvedItems = await this.resolveInvoiceItems(service, input.items);
    if (input.items.length > 0) {
      /***We are limiting one invoice to a single item
       * This is to ensure easier accounting for businesses.
       */
      throw new BadRequestException(`An invoice can only contain one item`);
    }
    const amount = resolvedItems
      .reduce((total, item) => total + BigInt(item.amount), 0n)
      .toString();
    const expiresAt = this.getInvoiceExpiryDate(
      paymentRule.invoiceExpiryMinutes,
    );

    this.validateSubmittedTotal(formDetails.totalAmount, amount);

    const invoice = await this.createInvoiceWithRetry(
      input,
      service,
      paymentRule.currencyCode,
      resolvedItems,
      amount,
      expiresAt,
    );

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
        payerFullName: invoice.payerFullName,
        payerEmail: invoice.payerEmail,
        phoneNumber: invoice.phoneNumber,
        serviceId: invoice.serviceId,
        expiresAt: invoice.expiresAt,
      },
    });

    return this.buildInvoiceResponse(invoice, service, business, resolvedItems);
  }

  private validateServiceForInvoice(
    service: OrganizationService,
    input: CreateInvoice,
  ) {
    if (!service.isActive) {
      throw new BadRequestException('This service is not currently available');
    }

    if (!service.customerPayForListOfItems && input.items.length !== 1) {
      throw new BadRequestException(
        'This service only accepts payment for a single item',
      );
    }
  }

  private getInvoicePaymentRule(service: OrganizationService) {
    if (!service.paymentrule) {
      throw new BadRequestException(
        'Payment rules are not configured for this service',
      );
    }

    return service.paymentrule;
  }

  private validateSubmittedTotal(
    submittedTotal: unknown,
    amount: string,
  ): void {
    if (submittedTotal === undefined) {
      return;
    }

    if (this.toSubmittedTotalAmount(submittedTotal) !== BigInt(amount)) {
      throw new BadRequestException(
        'totalAmount does not match the sum of selected items',
      );
    }
  }

  private toSubmittedTotalAmount(submittedTotal: unknown) {
    try {
      return BigInt(submittedTotal as string | number | bigint | boolean);
    } catch {
      throw new BadRequestException(
        'totalAmount must be an integer amount in the smallest currency unit',
      );
    }
  }

  private getInvoiceExpiryDate(invoiceExpiryMinutes?: number) {
    return invoiceExpiryMinutes
      ? new Date(Date.now() + invoiceExpiryMinutes * 60 * 1000)
      : null;
  }

  private async createInvoiceWithRetry(
    input: CreateInvoice,
    service: OrganizationService,
    currencyCode: string,
    resolvedItems: ResolvedInvoiceItem[],
    amount: string,
    expiresAt: Date | null,
  ) {
    for (
      let attempt = 1;
      attempt <= INVOICE_MAX_REFERENCE_GENERATION_ATTEMPTS;
      attempt++
    ) {
      try {
        return await this.saveInvoiceWithItems(
          input,
          service,
          currencyCode,
          resolvedItems,
          amount,
          expiresAt,
        );
      } catch (error) {
        if (this.shouldRetryInvoiceReference(error, attempt)) {
          continue;
        }

        if (input.merchantReference && this.isUniqueViolation(error)) {
          const existing = await this.findExistingInvoiceByMerchantReference(
            input,
            service,
          );

          if (existing) {
            return existing;
          }
        }

        throw error;
      }
    }

    throw new BadRequestException(
      'Failed to generate a unique invoice reference, please try again',
    );
  }

  private shouldRetryInvoiceReference(error: unknown, attempt: number) {
    return (
      this.isReferenceCollision(error) &&
      attempt < INVOICE_MAX_REFERENCE_GENERATION_ATTEMPTS
    );
  }

  private async saveInvoiceWithItems(
    input: CreateInvoice,
    service: OrganizationService,
    currencyCode: string,
    resolvedItems: ResolvedInvoiceItem[],
    amount: string,
    expiresAt: Date | null,
  ) {
    return this.invoiceRepo.manager.transaction(async (manager) => {
      const invoiceRepo = manager.getRepository(OrganisationInvoice);

      const existing = await this.findExistingInvoiceByMerchantReference(
        input,
        service,
        manager,
      );

      if (existing) {
        return existing;
      }

      const savedInvoice = await invoiceRepo.save(
        invoiceRepo.create({
          businessId: service.businessId,
          environment: service.environment,
          serviceId: input.serviceId,
          payerFullName: this.getRequiredFormString(
            input.formDetails,
            'payerFullName',
          ),
          payerEmail: this.getRequiredFormString(
            input.formDetails,
            'payerEmail',
          ).toLowerCase(),
          phoneNumber: this.getOptionalFormString(
            input.formDetails,
            'phoneNumber',
          ),
          formDetails: input.formDetails,
          amount,
          currencyCode,
          status: InvoiceStatus.PENDING,
          expiresAt,
          reference: this.generateInvoiceReference(),
          merchantReference: input.merchantReference,
          redemptionStatus: service.requiredRedemption
            ? RedemptionStatus.NOT_USED
            : null,
        }),
      );

      await this.saveInvoiceItems(savedInvoice, resolvedItems, manager);

      return savedInvoice;
    });
  }

  private async findExistingInvoiceByMerchantReference(
    input: CreateInvoice,
    service: OrganizationService,
    manager?: EntityManager,
  ) {
    if (!input.merchantReference) {
      return null;
    }

    const invoiceRepo =
      manager?.getRepository(OrganisationInvoice) ?? this.invoiceRepo;

    return invoiceRepo.findOne({
      where: {
        businessId: service.businessId,
        merchantReference: input.merchantReference,
      },
      relations: { items: true },
    });
  }

  private async saveInvoiceItems(
    invoice: OrganisationInvoice,
    resolvedItems: ResolvedInvoiceItem[],
    manager: EntityManager,
  ) {
    const invoiceItemRepo = manager.getRepository(InvoiceItem);
    const invoiceItems = resolvedItems.map((resolved) =>
      invoiceItemRepo.create({
        businessId: invoice.businessId,
        environment: invoice.environment,
        amount: resolved.amount,
        baseAmount: resolved.baseAmount,
        taxAmount: resolved.taxAmount,
        taxId: resolved.taxId,
        invoiceId: invoice.invoiceId,
        itemId: resolved.itemId,
      }),
    );
    const savedInvoiceItems = await invoiceItemRepo.save(invoiceItems);

    await this.taxManagementService.createAssessedTaxTransactions(
      savedInvoiceItems
        .filter((item) => item.taxId && BigInt(item.taxAmount) > 0n)
        .map((item) => ({
          businessId: item.businessId,
          environment: item.environment,
          invoiceId: item.invoiceId,
          invoiceItemId: item.invoiceItemId,
          itemId: item.itemId,
          taxId: item.taxId as string,
          baseAmount: item.baseAmount,
          taxAmount: item.taxAmount,
        })),
      manager,
    );
  }

  private buildInvoiceResponse(
    invoice: OrganisationInvoice,
    service: OrganizationService,
    business: Businesses | null,
    items: {
      itemId: string;
      amount: string;
      baseAmount?: string;
      taxAmount?: string;
      taxId?: string | null;
    }[],
  ) {
    return {
      invoiceId: invoice.invoiceId,
      reference: invoice.reference,
      merchantReference: invoice.merchantReference,
      amount: invoice.amount,
      currencyCode: invoice.currencyCode,
      status: invoice.status,
      payerFullName: invoice.payerFullName,
      payerEmail: invoice.payerEmail,
      phoneNumber: invoice.phoneNumber,
      formDetails: invoice.formDetails,
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
        baseAmount: item.baseAmount ?? item.amount,
        taxAmount: item.taxAmount ?? '0',
        taxId: item.taxId ?? null,
      })),
    };
  }

  private async resolveInvoiceItems(
    service: OrganizationService,
    selectedItems: SelectedInvoiceItem[],
  ) {
    const taxIds = [
      ...new Set(
        (service.items ?? [])
          .map((item) => item.taxId)
          .filter((taxId): taxId is string => Boolean(taxId)),
      ),
    ];
    const activeTaxConfigs =
      await this.taxManagementService.getActiveTaxConfigurations(taxIds);

    return selectedItems.map((selection) => {
      const item = service.items?.find(
        (serviceItem) => serviceItem.itemId === selection.itemId,
      );

      if (!item) {
        throw new BadRequestException(
          `Item ${selection.itemId} does not belong to this service`,
        );
      }

      const baseAmount = item.fixedPrice ? item.fixedAmount : selection.amount;

      if (!baseAmount) {
        throw new BadRequestException(
          `Amount is required for item ${item.name}`,
        );
      }

      const tax = item.taxId ? activeTaxConfigs.get(item.taxId) : null;

      if (item.taxId && !tax) {
        throw new BadRequestException(
          `Tax configuration is inactive or unavailable for item ${item.name}`,
        );
      }

      const taxAmount = tax
        ? this.taxManagementService.calculateTaxAmount(baseAmount, tax.rate)
        : 0n;
      const invoiceAmount =
        BigInt(baseAmount) +
        (tax?.payer === TaxPayer.CUSTOMER ? taxAmount : 0n);

      return {
        itemId: item.itemId,
        amount: invoiceAmount.toString(),
        baseAmount,
        taxAmount: taxAmount.toString(),
        taxId: item.taxId ?? null,
      };
    });
  }

  private generateInvoiceReference(): string {
    const digits = () => Crypto.randomInt(0, 10000).toString().padStart(4, '0');
    const letters = () =>
      Array.from({ length: 4 }, () =>
        String.fromCodePoint(65 + Crypto.randomInt(0, 26)),
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
        const txnReference = generateRrn();
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
            invoiceTransactionReference: txnReference,
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
      attempt.invoiceTransactionReference,
    );

    return {
      invoicePaymentTransactionId: attempt.invoiceTransactionReference,
      ...result,
    };
  }

  private validateFormDetails(
    forms: OrganisationCustomForm[],
    formDetails: Record<string, any>,
  ) {
    for (const form of forms) {
      const value = formDetails?.[form.formKey];

      this.validateRequiredFormValue(form, value);

      if (!this.hasFormValue(value)) {
        continue;
      }

      this.validateSubmittedFormValue(form, value);
    }
  }

  private getRequiredFormString(
    formDetails: Record<string, any>,
    key: string,
  ): string {
    const value = this.getOptionalFormString(formDetails, key);

    if (!value) {
      throw new BadRequestException(`${key} is required`);
    }

    return value;
  }

  private getOptionalFormString(
    formDetails: Record<string, any>,
    key: string,
  ): string | null {
    const value = formDetails[key];

    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      typeof value !== 'boolean'
    ) {
      throw new BadRequestException(`${key} must be a valid value`);
    }

    return String(value).trim();
  }

  private validateRequiredFormValue(
    form: OrganisationCustomForm,
    value: unknown,
  ) {
    if (form.required === 'Y' && !this.hasFormValue(value)) {
      throw new BadRequestException(`${form.formLabel} is required`);
    }
  }

  private hasFormValue(value: unknown) {
    return value !== undefined && value !== null && value !== '';
  }

  private validateSubmittedFormValue(
    form: OrganisationCustomForm,
    value: unknown,
  ) {
    if (INVOICE_OPTION_BASED_FORM_TYPES.includes(form.formType)) {
      this.validateOptionBasedFormValue(form, value);
      return;
    }

    this.validateTypedFormValue(form, value);
  }

  private validateOptionBasedFormValue(
    form: OrganisationCustomForm,
    value: unknown,
  ) {
    const validOptions = (form.options ?? []).map((option) => option.value);
    const submittedValues = Array.isArray(value) ? value : [value];
    const isValid = submittedValues.every((submitted) =>
      validOptions.includes(this.toSubmittedOptionValue(form, submitted)),
    );

    if (!isValid) {
      throw new BadRequestException(
        `Invalid value for ${form.formLabel}. Expected one of: ${validOptions.join(', ')}`,
      );
    }
  }

  private toSubmittedOptionValue(
    form: OrganisationCustomForm,
    value: unknown,
  ): string {
    const scalarValue = this.getScalarFormValue(form, value);

    return typeof scalarValue === 'string'
      ? scalarValue
      : scalarValue.toString();
  }

  private getScalarFormValue(
    form: OrganisationCustomForm,
    value: unknown,
  ): string | number | boolean {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    throw new BadRequestException(`${form.formLabel} must be a valid value`);
  }

  private validateTypedFormValue(form: OrganisationCustomForm, value: unknown) {
    if (form.formType === FormType.EMAIL) {
      this.validateEmailFormValue(form, value);
    }

    if (form.formType === FormType.NUMBER) {
      this.validateNumberFormValue(form, value);
    }

    if (form.formType === FormType.DATE) {
      this.validateDateFormValue(form, value);
    }
  }

  private validateEmailFormValue(form: OrganisationCustomForm, value: unknown) {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${form.formLabel} must be a valid email`);
    }

    if (!isEmail(value)) {
      throw new BadRequestException(`${form.formLabel} must be a valid email`);
    }
  }

  private validateNumberFormValue(
    form: OrganisationCustomForm,
    value: unknown,
  ) {
    const scalarValue = this.getScalarFormValue(form, value);

    if (typeof scalarValue === 'boolean' || Number.isNaN(Number(scalarValue))) {
      throw new BadRequestException(`${form.formLabel} must be a number`);
    }
  }

  private validateDateFormValue(form: OrganisationCustomForm, value: unknown) {
    if (!this.isValidDateFormValue(value)) {
      throw new BadRequestException(`${form.formLabel} must be a valid date`);
    }
  }

  private isValidDateFormValue(value: unknown) {
    if (typeof value === 'string') {
      return !Number.isNaN(Date.parse(value));
    }

    if (typeof value === 'number') {
      return !Number.isNaN(new Date(value).getTime());
    }

    return false;
  }
}
