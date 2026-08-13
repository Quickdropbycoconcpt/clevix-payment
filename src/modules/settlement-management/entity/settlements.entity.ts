import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { IncomingPaymentSource } from 'src/shared/enum';
import { BusinessSettlementType } from './business_settlement_config.entity';
import { SettlementTransactionStatus } from './settlement-status.enum';
import { SettlementTransactions } from './settlement_transactions.entity';

@Entity('settlements')
export class Settlements extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  settlementId: string;

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

  @Column({
    type: 'enum',
    enum: SettlementTransactionStatus,
    default: SettlementTransactionStatus.UNSETTLED,
  })
  status: SettlementTransactionStatus;

  @OneToMany(() => SettlementTransactions, (txn) => txn.settlement)
  transactions: SettlementTransactions[];
}
