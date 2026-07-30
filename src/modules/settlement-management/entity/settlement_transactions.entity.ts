import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SettlementBankAccounts } from './settlement_accounts.entity';
import { IncomingPaymentSource } from 'src/shared/enum';
import { BusinessSettlementType } from './business_settlement_config.entity';

export enum SettlementTransactionStatus {
  UNSETTLED = 'UNSETTLED',
  SETTLED = 'SETTLED',
}

@Entity('settlement_transactions')
export class SettlementTransactions extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  settlementTransactionsId: string;

  @Column({ type: 'enum', enum: IncomingPaymentSource })
  paymentSource: IncomingPaymentSource;

  @Column({ type: 'bigint' })
  expectedSettledAmount: string;

  @Column({ type: 'date' })
  settlementDate: string;

  @Column({ enum: BusinessSettlementType, type: 'enum' })
  settlementType: BusinessSettlementType;

  @Column({ type: 'bigint', default: 0 })
  settledAmount: string;

  @Column({ type: 'timestamptz', nullable: true })
  settledAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  settlementbankAccountId: string | null;

  @ManyToOne(() => SettlementBankAccounts)
  @JoinColumn({ name: 'settlementbankAccountId' })
  settlementBankAccount: SettlementBankAccounts;

  @Column({
    type: 'enum',
    enum: SettlementTransactionStatus,
    default: SettlementTransactionStatus.UNSETTLED,
  })
  status: SettlementTransactionStatus;
}
