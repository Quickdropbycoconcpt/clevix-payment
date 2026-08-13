import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BasicStatus } from 'src/shared/enum';
import { Wallets } from 'src/modules/wallets/entity/wallet.entity';
import { SettlementBankAccounts } from 'src/modules/settlement-management/entity/settlement_accounts.entity';
import { TaxConfiguration } from './tax-config.entity';

export enum TaxSettlementDestinationType {
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  WALLET = 'WALLET',
  GOVERNMENT_DIRECT = 'GOVERNMENT_DIRECT',
}

@Entity('tax_settlement_destinations')
@Index(['taxId'])
@Index(['destinationType'])
@Index(['status'])
export class TaxSettlementDestination extends NonEnvironmentBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  taxSettlementDestinationId: string;

  @Column({ type: 'uuid' })
  taxId: string;

  @ManyToOne(() => TaxConfiguration)
  @JoinColumn({ name: 'taxId' })
  tax: TaxConfiguration;

  @Column({
    type: 'enum',
    enum: TaxSettlementDestinationType,
  })
  destinationType: TaxSettlementDestinationType;

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
    enum: BasicStatus,
    default: BasicStatus.ACTIVE,
  })
  status: BasicStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
