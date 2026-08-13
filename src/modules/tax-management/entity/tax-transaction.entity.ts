import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TaxConfiguration } from './tax-config.entity';
import {
  TaxSettlementDestination,
  TaxSettlementDestinationType,
} from './tax-settlement-destination.entity';
import { SettlementBankAccounts } from 'src/modules/settlement-management/entity/settlement_accounts.entity';
import { Wallets } from 'src/modules/wallets/entity/wallet.entity';
import { TaxCollectionMode, TaxPayer } from 'src/shared/enum';

export enum TaxTransactionStatus {
  ASSESSED = 'ASSESSED',
  COLLECTED = 'COLLECTED',
  REMITTED = 'REMITTED',
  FAILED = 'FAILED',
}

@Entity('tax_transactions')
@Index(['invoiceId'])
@Index(['invoiceItemId'])
@Index(['transactionId'])
@Index(['taxId'])
@Index(['status'])
export class TaxTransaction extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  taxTransactionId: string;

  @Column({ type: 'uuid' })
  taxId: string;

  @ManyToOne(() => TaxConfiguration)
  @JoinColumn({ name: 'taxId' })
  tax: TaxConfiguration;

  @Column({ type: 'uuid' })
  invoiceId: string;

  @Column({ type: 'uuid' })
  invoiceItemId: string;

  @Column({ type: 'uuid' })
  itemId: string;

  @Column({ type: 'uuid', nullable: true })
  transactionId: string | null;

  @Column({ type: 'bigint' })
  baseAmount: string;

  @Column({ type: 'bigint' })
  taxAmount: string;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  rate: number;

  @Column({ type: 'enum', enum: TaxCollectionMode })
  collectionMode: TaxCollectionMode;

  @Column({ type: 'enum', enum: TaxPayer })
  payer: TaxPayer;

  @Column({ type: 'uuid', nullable: true })
  taxSettlementDestinationId: string | null;

  @ManyToOne(() => TaxSettlementDestination)
  @JoinColumn({ name: 'taxSettlementDestinationId' })
  taxSettlementDestination: TaxSettlementDestination;

  @Column({
    type: 'enum',
    enum: TaxSettlementDestinationType,
    nullable: true,
  })
  destinationType: TaxSettlementDestinationType | null;

  @Column({ type: 'uuid', nullable: true })
  settlementBankAccountId: string | null;

  @ManyToOne(() => SettlementBankAccounts)
  @JoinColumn({ name: 'settlementBankAccountId' })
  settlementBankAccount: SettlementBankAccounts;

  @Column({ type: 'uuid', nullable: true })
  walletId: string | null;

  @ManyToOne(() => Wallets)
  @JoinColumn({ name: 'walletId' })
  wallet: Wallets;

  @Column({ type: 'varchar', nullable: true })
  providerRevenueCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  governmentAgencyCode: string | null;

  @Column({
    type: 'enum',
    enum: TaxTransactionStatus,
    default: TaxTransactionStatus.ASSESSED,
  })
  status: TaxTransactionStatus;

  @Column({ type: 'timestamptz', nullable: true })
  collectedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  remittedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
