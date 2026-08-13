import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  WalletTransactionSource,
  WalletTransactionStatus,
  WalletTransactionType,
} from 'src/shared/enum';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Wallets } from './wallet.entity';

@Entity('wallet_transactions')
@Index(['walletId', 'createdAt'])
@Index(['businessId', 'environment', 'reference'], { unique: true })
export class WalletTransactions extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  walletTransactionId: string;

  @Column({ type: 'uuid' })
  walletId: string;

  @ManyToOne(() => Wallets)
  @JoinColumn({ name: 'walletId' })
  wallet: Wallets;

  @Column({ type: 'varchar', unique: true })
  reference: string;

  @Column({ type: 'varchar', nullable: true })
  providerReference: string | null;

  @Column({ type: 'enum', enum: WalletTransactionType })
  transactionType: WalletTransactionType;

  @Column({ type: 'bigint' })
  amount: string;

  @Column({ type: 'bigint' })
  availableBalanceBefore: string;

  @Column({ type: 'bigint' })
  availableBalanceAfter: string;

  @Column({ type: 'varchar' })
  currency: string;

  @Column({ type: 'varchar' })
  narration: string;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'enum', enum: WalletTransactionStatus })
  status: WalletTransactionStatus;

  @Column({ type: 'enum', enum: WalletTransactionSource })
  source: WalletTransactionSource;

  @Column({ type: 'uuid', nullable: true })
  sourceId: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  idempotencyKey: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
