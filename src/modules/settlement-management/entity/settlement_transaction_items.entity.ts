import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Transactions } from 'src/modules/transactions/entity/transaction.entity';
import { SettlementTransactions } from './settlement_transactions.entity';

@Entity('settlement_transaction_items')
@Unique(['settlementTransactionsId', 'transactionId'])
export class SettlementTransactionItems extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  settlementTransactionItemId: string;

  @Column({ type: 'uuid' })
  settlementTransactionsId: string;

  @ManyToOne(() => SettlementTransactions)
  @JoinColumn({ name: 'settlementTransactionsId' })
  settlementTransaction: SettlementTransactions;

  @Column({ type: 'uuid' })
  transactionId: string;

  @ManyToOne(() => Transactions)
  @JoinColumn({ name: 'transactionId' })
  transaction: Transactions;

  @Column({ type: 'bigint' })
  amount: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
