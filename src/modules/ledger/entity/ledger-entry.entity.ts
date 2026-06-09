import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LedgerAccount } from './ledger-account.entity';
import { LedgerTransaction } from './ledger-transaction.entity';
import { LedgerEntryDirection } from 'src/shared/enum';

@Entity('ledger_entries')
@Index(['ledgerTransactionId', 'ledgerAccountId', 'direction'])
export class LedgerEntry extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  ledgerEntryId: string;

  @Column({ type: 'uuid' })
  ledgerTransactionId: string;

  @Column({ type: 'uuid' })
  ledgerAccountId: string;

  @Column({ type: 'enum', enum: LedgerEntryDirection })
  direction: LedgerEntryDirection;

  @Column({ type: 'bigint' })
  amount: string;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'varchar', nullable: true })
  memo: string;

  @ManyToOne(() => LedgerTransaction, (transaction) => transaction.entries)
  @JoinColumn({
    name: 'ledgerTransactionId',
    referencedColumnName: 'ledgerTransactionId',
  })
  ledgerTransaction: LedgerTransaction;

  @ManyToOne(() => LedgerAccount, (account) => account.entries)
  @JoinColumn({
    name: 'ledgerAccountId',
    referencedColumnName: 'ledgerAccountId',
  })
  ledgerAccount: LedgerAccount;
}
