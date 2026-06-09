import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LedgerTransactionStatus } from '../enums/ledger.enums';
import { LedgerEntry } from './ledger-entry.entity';

@Entity('ledger_transactions')
export class LedgerTransaction extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  ledgerTransactionId: string;

  @Column({ type: 'varchar' })
  @Index({ unique: true })
  reference: string;

  @Column({ type: 'varchar' })
  transactionType: string;

  @Column({ type: 'enum', enum: LedgerTransactionStatus })
  status: LedgerTransactionStatus;

  @Column({ type: 'varchar', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @OneToMany(() => LedgerEntry, (entry) => entry.ledgerTransaction)
  entries: LedgerEntry[];
}
