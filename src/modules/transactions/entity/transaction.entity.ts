import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  LedgerEntryDirection,
  TransactionRiskStatus,
  TransactionSettlementStatus,
  TransactionSource,
  TransactionStatus,
} from 'src/shared/enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('transactions')
export class Transactions extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  transactionId: string;

  @Column({ type: 'uuid' })
  businessId: string;

  @Column({ type: 'bigint' })
  expectedAmount: string;

  @Column({ type: 'bigint' })
  settledAmount: string;

  @Column({ type: 'bigint', default: 0 })
  fee: string;

  @Column({ type: 'enum', enum: TransactionSource })
  source: TransactionSource;

  @Column({ type: 'varchar', unique: true })
  reference: string;

  @Column({ type: 'varchar' })
  remark: string;

  @Column({ type: 'uuid', nullable: true })
  sourceId: string;

  @Column({ type: 'varchar' })
  currency: string;

  @Column({ type: 'varchar' })
  provider: string;

  @Column({ type: 'enum', enum: TransactionStatus })
  executionStatus: TransactionStatus;

  @Column({ type: 'varchar', nullable: true })
  merchantReference: string;

  @Column({ type: 'varchar', nullable: true })
  providerReference: string;

  @Column({ type: 'enum', nullable: true, enum: TransactionSettlementStatus })
  settlementStatus: TransactionSettlementStatus;

  @Column({ type: 'enum', nullable: true, enum: TransactionRiskStatus })
  riskStatus: TransactionRiskStatus;

  @Column({ type: 'enum', enum: LedgerEntryDirection })
  direction: LedgerEntryDirection;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  idempotencyKey: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
