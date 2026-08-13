import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceItems } from 'src/modules/service-checkout/entity/service_items.entity';
import { OrganisationInvoice } from './service_checkout_invoice.entity';
import { TaxConfiguration } from 'src/modules/tax-management/entity/tax-config.entity';

@Entity('invoice_items')
export class InvoiceItem extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  invoiceItemId: string;

  @Column({ type: 'bigint' })
  amount: string;

  @Column({ type: 'bigint' })
  baseAmount: string;

  @Column({ type: 'bigint', default: 0 })
  taxAmount: string;

  @Column({ type: 'uuid', nullable: true })
  taxId: string | null;

  @ManyToOne(() => TaxConfiguration)
  @JoinColumn({ name: 'taxId' })
  tax: TaxConfiguration;

  @Column({ type: 'uuid' })
  invoiceId: string;

  @ManyToOne(() => OrganisationInvoice, (invoice) => invoice.items)
  @JoinColumn({ name: 'invoiceId' })
  invoice: OrganisationInvoice;

  @Column({ type: 'uuid' })
  itemId: string;

  @ManyToOne(() => ServiceItems)
  @JoinColumn({ name: 'itemId' })
  item: ServiceItems;
}
