import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index(
  'IDX_transaction_fees_transaction_source',
  ['transactionId', 'feeSource'],
  { unique: true },
)
@Entity('transaction_fees')
export class TransactionFees extends NonEnvironmentBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  transactionFeeId: string;

  @Column({ type: 'uuid' })
  transactionId: string;

  @Column({ type: 'uuid' })
  businessId: string;

  @Column({ type: 'varchar' })
  provider: string;

  @Column({ type: 'varchar' })
  feeSource: string;

  @Column({ type: 'bigint', default: 0 })
  grossAmount: string;

  @Column({ type: 'bigint', default: 0 })
  chargedFee: string;

  @Column({ type: 'bigint', default: 0 })
  providerFee: string;

  @Column({ type: 'bigint', default: 0 })
  platformRevenue: string;
}
