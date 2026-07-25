import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrganisationPaymentRules } from './service_payment_rules.entity';
import { OrganisationCustomForm } from './service_payment_form.entity';
import { OrganisationInvoice } from 'src/modules/service-checkout-invoice/entity/service_checkout_invoice.entity';
import { ServiceItems } from './service_items.entity';

@Entity('organization_services')
export class OrganizationService extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  serviceId: string;

  @Column({ type: 'varchar' })
  serviceName: string;

  @Column({ type: 'boolean', default: false })
  apiInitiationOnly: boolean;

  @Column({ type: 'boolean', default: false })
  customerPayForListOfItems: boolean;

  @Column({ type: 'boolean', default: false })
  requiredRedemption: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => OrganisationCustomForm, (form) => form.service)
  customForms: OrganisationCustomForm[];

  @OneToOne(() => OrganisationPaymentRules, (rule) => rule.service)
  @JoinColumn({ name: 'paymentRuleId' })
  paymentrule: OrganisationPaymentRules;

  @OneToMany(() => OrganisationInvoice, (invoice) => invoice.service)
  invoices: OrganisationInvoice[];

  @OneToMany(() => ServiceItems, (item) => item.service)
  items: ServiceItems[];
}
