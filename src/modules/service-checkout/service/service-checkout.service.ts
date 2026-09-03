import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { OrganizationService } from '../entity/service_definition.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { OrganisationPaymentRules } from '../entity/service_payment_rules.entity';
import {
  CreateService,
  CreateServiceItem,
  UpdateService,
  UpdateServiceItem,
} from '../interface/service.interface';
import { Businesses } from 'src/modules/businesses/entity/business.entity';
import {
  FormOwnerType,
  OrganisationCustomForm,
} from '../entity/service_payment_form.entity';
import { OrganisationFormOption } from '../entity/service_payment_form_option.entity';
import { ServiceItems } from '../entity/service_items.entity';
import { BanksService } from 'src/modules/Api/banks/service/banks.service';
import { SettlementBankAccounts } from 'src/modules/settlement-management/entity/settlement_accounts.entity';
import { getBusinessScope, RequestScope } from 'src/shared/business-scope';
import { createOffsetPaginatedResponse } from 'src/shared/http/pagination';

@Injectable()
export class ServiceCheckout {
  constructor(
    @InjectRepository(OrganizationService)
    private readonly serviceRepo: Repository<OrganizationService>,
    private readonly banksService: BanksService,
    @InjectRepository(OrganisationCustomForm)
    private readonly customForms: Repository<OrganisationCustomForm>,
    @InjectRepository(SettlementBankAccounts)
    private readonly settlementAccountRepo: Repository<SettlementBankAccounts>,
    @InjectRepository(ServiceItems)
    private readonly serviceItemRepo: Repository<ServiceItems>,
  ) {}

  private async assertSettlementAccountsExist(bankAccountIds: string[]) {
    if (bankAccountIds.length === 0) {
      return;
    }

    const banks = await this.settlementAccountRepo.find({
      where: { bankAccountId: In(bankAccountIds) },
    });

    if (banks.length !== new Set(bankAccountIds).size) {
      throw new BadRequestException(`Please select from account you have added`);
    }
  }

  async getMandatoryFields(environment: string) {
    return this.customForms.find({
      where: { ownerType: FormOwnerType.PLATFORM, environment },
      relations: { options: true },
    });
  }

  async getOrganizationsServicesRendered(businessId: string) {
    const services = await this.serviceRepo.find({
      where: { businessId, isActive: true },
      relations: {
        paymentrule: true,
        customForms: { options: true },
      },
    });

    await Promise.all(
      services.map((service) => this.attachMandatoryFields(service)),
    );

    return services;
  }

  async getBusinessesWithServices(name?: string) {
    const query = this.serviceRepo
      .createQueryBuilder('service')
      .innerJoin(
        Businesses,
        'business',
        'business.businessId = service.businessId',
      )
      .distinct(true)
      .select('business.businessId', 'businessId')
      .addSelect('business.businessName', 'businessName');

    if (name?.trim()) {
      query.andWhere('business.businessName ILIKE :name', {
        name: `%${name.trim()}%`,
      });
    }

    return query.getRawMany<{ businessId: string; businessName: string }>();
  }

  async getServiceById(serviceId: string) {
    const service = await this.serviceRepo.findOne({
      where: { serviceId: serviceId.trim() },
      relations: {
        paymentrule: true,
        customForms: { options: true },
        items: { tax: true },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    await this.attachMandatoryFields(service);

    return service;
  }

  private async attachMandatoryFields(service: OrganizationService) {
    const mandatoryFields = await this.getMandatoryFields(service.environment);

    service.customForms = [
      ...mandatoryFields,
      ...(service.customForms ?? []),
    ].sort((a, b) => Number(a.sequenceNo) - Number(b.sequenceNo));

    return service;
  }

  async createService(input: CreateService) {
    return this.serviceRepo.manager.transaction(async (manager) => {
      const serviceRepo = manager.getRepository(OrganizationService);
      const paymentRuleRepo = manager.getRepository(OrganisationPaymentRules);
      const customFormRepo = manager.getRepository(OrganisationCustomForm);
      const formOptionRepo = manager.getRepository(OrganisationFormOption);
      const serviceItemRepo = manager.getRepository(ServiceItems);
      const bankAccountIds = input.items
        .filter((item) => item.settlementAccountId != null)
        .map((i) => i.settlementAccountId);
      await this.assertSettlementAccountsExist(bankAccountIds);

      const newPaymentRule = paymentRuleRepo.create({
        businessId: input.businessId,
        environment: input.environment,
        chargeFee: input.paymentRule.chargeFee,
        acceptPartPayment: input.paymentRule.acceptPartPayment,
        invoiceExpiryMinutes: input.paymentRule.invoiceExpiryMinutes,
        currencyCode: input.paymentRule.currencyCode,
      });
      const paymentRule = await paymentRuleRepo.save(newPaymentRule);

      const newService = serviceRepo.create({
        businessId: input.businessId,
        environment: input.environment,
        serviceName: input.serviceName,
        apiInitiationOnly: input.apiInitiationOnly ?? false,
        customerPayForListOfItems: input.customerPayForListOfItems,
        paymentrule: {
          paymentRuleId: paymentRule.paymentRuleId,
        } as OrganisationPaymentRules,
      });

      const service = await serviceRepo.save(newService);

      const items = input.items.map((item) =>
        serviceItemRepo.create({
          businessId: input.businessId,
          environment: input.environment,
          name: item.name,
          fixedPrice: item.fixedPrice,
          fixedAmount: item.fixedAmount,
          settlementAccountId: item.settlementAccountId,
          taxId: item.taxId ?? null,
          service: { serviceId: service.serviceId } as OrganizationService,
        }),
      );
      await serviceItemRepo.save(items);

      for (const form of input.customForms) {
        const newForm = customFormRepo.create({
          environment: input.environment,
          formType: form.formType,
          formKey: form.formKey,
          formLabel: form.formLabel,
          formLength: form.formLength,
          sequenceNo: form.sequenceNo,
          required: form.required,
          isMandatory: false,
          ownerType: FormOwnerType.SERVICE,
          service: { serviceId: service.serviceId } as OrganizationService,
        });

        const savedForm = await customFormRepo.save(newForm);

        if (form.options?.length) {
          const options = form.options.map((option) =>
            formOptionRepo.create({
              businessId: input.businessId,
              environment: input.environment,
              label: option.label,
              value: option.value,
              sequenceNo: option.sequenceNo,
              customForm: {
                formId: savedForm.formId,
              } as OrganisationCustomForm,
            }),
          );
          await formOptionRepo.save(options);
        }
      }

      return { serviceName: service.serviceName };
    });
  }

  async toggleServiceStatus(scope: RequestScope, serviceId: string) {
    const { businessId, environment } = getBusinessScope(scope);

    const service = await this.serviceRepo.findOne({
      where: { serviceId: serviceId.trim(), businessId, environment },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    service.isActive = !service.isActive;
    await this.serviceRepo.save(service);

    return { serviceId: service.serviceId, isActive: service.isActive };
  }

  async updateService(
    scope: RequestScope,
    serviceId: string,
    input: UpdateService,
  ) {
    const { businessId, environment } = getBusinessScope(scope);

    const service = await this.serviceRepo.findOne({
      where: { serviceId: serviceId.trim(), businessId, environment },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (input.serviceName !== undefined) {
      service.serviceName = input.serviceName;
    }
    if (input.apiInitiationOnly !== undefined) {
      service.apiInitiationOnly = input.apiInitiationOnly;
    }
    if (input.customerPayForListOfItems !== undefined) {
      service.customerPayForListOfItems = input.customerPayForListOfItems;
    }

    return this.serviceRepo.save(service);
  }

  async addServiceItem(
    scope: RequestScope,
    serviceId: string,
    input: CreateServiceItem,
  ) {
    const { businessId, environment } = getBusinessScope(scope);

    const service = await this.serviceRepo.findOne({
      where: { serviceId: serviceId.trim(), businessId, environment },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    await this.assertSettlementAccountsExist([input.settlementAccountId]);

    const item = this.serviceItemRepo.create({
      businessId,
      environment,
      name: input.name,
      fixedPrice: input.fixedPrice,
      fixedAmount: input.fixedAmount,
      settlementAccountId: input.settlementAccountId,
      taxId: input.taxId ?? null,
      service: { serviceId: service.serviceId } as OrganizationService,
    });

    return this.serviceItemRepo.save(item);
  }

  async updateServiceItem(
    scope: RequestScope,
    serviceId: string,
    itemId: string,
    input: UpdateServiceItem,
  ) {
    const { businessId, environment } = getBusinessScope(scope);

    const item = await this.serviceItemRepo.findOne({
      where: {
        itemId: itemId.trim(),
        businessId,
        environment,
        service: { serviceId: serviceId.trim() },
      },
    });

    if (!item) {
      throw new NotFoundException('Service item not found');
    }

    if (input.settlementAccountId !== undefined) {
      await this.assertSettlementAccountsExist([input.settlementAccountId]);
      item.settlementAccountId = input.settlementAccountId;
    }
    if (input.name !== undefined) {
      item.name = input.name;
    }
    if (input.fixedPrice !== undefined) {
      item.fixedPrice = input.fixedPrice;
    }
    if (input.fixedAmount !== undefined) {
      item.fixedAmount = input.fixedAmount;
    }
    if (input.taxId !== undefined) {
      item.taxId = input.taxId;
    }

    if (item.fixedPrice && !item.fixedAmount) {
      throw new BadRequestException(
        'fixedAmount is required when fixedPrice is true',
      );
    }

    return this.serviceItemRepo.save(item);
  }

  async listServices(scope: RequestScope, name: string) {
    const { businessId, environment, pagination } = getBusinessScope(scope);
    const query = this.serviceRepo
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.paymentrule', 'paymentrule')
      .where('service.businessId = :businessId', { businessId })
      .andWhere('service.environment = :environment', { environment })
      .orderBy('service.createdAt', 'DESC')
      .skip(pagination.skip)
      .take(pagination.take);

    if (name?.trim()) {
      query.andWhere('service.serviceName ILIKE :name', {
        name: `%${name.trim()}%`,
      });
    }

    const [services, total] = await query.getManyAndCount();

    return createOffsetPaginatedResponse(services, pagination, { total });
  }
}
