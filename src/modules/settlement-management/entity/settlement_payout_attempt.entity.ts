import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SettlementTransactions } from './settlement_transactions.entity';

export enum SettlementPayoutAttemptStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

@Entity('settlement_payout_attempts')
@Index(['settlementTransactionsId', 'status'])
@Index(['provider', 'reference'], { unique: true })
export class SettlementPayoutAttempts extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  payoutAttemptId: string;

  @Column({ type: 'uuid' })
  settlementTransactionsId: string;

  @ManyToOne(() => SettlementTransactions)
  @JoinColumn({ name: 'settlementTransactionsId' })
  settlementTransaction: SettlementTransactions;

  @Column({ type: 'varchar' })
  provider: string;

  @Column({ type: 'varchar' })
  reference: string;

  @Column({ type: 'varchar', nullable: true })
  providerReference: string | null;

  @Column({ type: 'bigint' })
  amount: string;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'varchar' })
  destinationAccountNumber: string;

  @Column({ type: 'varchar' })
  destinationAccountName: string;

  @Column({ type: 'varchar' })
  destinationBankCode: string;

  @Column({
    type: 'enum',
    enum: SettlementPayoutAttemptStatus,
    default: SettlementPayoutAttemptStatus.PENDING,
  })
  status: SettlementPayoutAttemptStatus;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  requestedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  rawRequest: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  rawResponse: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
