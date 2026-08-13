import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrganizationService } from 'src/modules/service-checkout/entity/service_definition.entity';
import { InvoicePaymentTransaction } from './invoice_transaction.entity';
import { InvoiceItem } from './invoice_item.entity';

export enum InvoiceStatus {
  PENDING = 'pending',
  PAID = 'paid',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum RedemptionStatus {
  NOT_USED = 'NOT_USED',
  REDEEMED = 'REDEEMED',
}

@Entity('organisation_invoices')
@Index(['businessId', 'merchantReference'], {
  unique: true,
  where: '"merchantReference" IS NOT NULL',
})
export class OrganisationInvoice extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  invoiceId: string;

  @Column({ type: 'varchar', unique: true })
  reference: string;

  @Column({ type: 'varchar', nullable: true })
  merchantReference: string;

  @Column({ type: 'varchar' })
  payerFullName: string;

  @Column({ type: 'varchar' })
  payerEmail: string;

  @Column({ type: 'varchar', nullable: true })
  phoneNumber: string | null;

  @Column({ type: 'jsonb' })
  formDetails: Record<string, any>;

  @Column({ type: 'bigint' })
  amount: string;

  @Column({ type: 'varchar' })
  currencyCode: string;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.PENDING })
  status: InvoiceStatus;

  @Column({ type: 'enum', enum: RedemptionStatus, nullable: true })
  redemptionStatus: RedemptionStatus | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  redeemedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  redeemedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @Column({ type: 'uuid' })
  serviceId: string;

  @ManyToOne(() => OrganizationService, (service) => service.invoices)
  @JoinColumn({ name: 'serviceId' })
  service: OrganizationService;

  @OneToMany(
    () => InvoicePaymentTransaction,
    (transaction) => transaction.invoice,
  )
  transactions: InvoicePaymentTransaction[];

  @OneToMany(() => InvoiceItem, (item) => item.invoice)
  items: InvoiceItem[];
}
