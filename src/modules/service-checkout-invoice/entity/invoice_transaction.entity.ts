import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrganisationInvoice } from './service_checkout_invoice.entity';
import { TransactionStatus } from 'src/shared/enum';

export enum SupportedPaymentMethod {
  POS = 'POS',
  TRANSFER = 'TRANSFER',
}

@Entity('invoice_payment_transactions')
export class InvoicePaymentTransaction extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  invoicePaymentTransactionId: string;

  @Column({ type: 'enum', enum: SupportedPaymentMethod })
  method: SupportedPaymentMethod;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  paymentStatus: TransactionStatus;

  @Column({ type: 'uuid', nullable: true })
  transactionId: string;

  @ManyToOne(() => OrganisationInvoice, (invoice) => invoice.transactions)
  @JoinColumn({ name: 'invoiceReference', referencedColumnName: 'reference' })
  invoice: OrganisationInvoice;
}
