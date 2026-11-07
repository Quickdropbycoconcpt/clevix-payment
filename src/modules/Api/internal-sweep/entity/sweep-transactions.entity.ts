import { OwnerlessBaseEntity } from 'src/infrastructure/database/base_entiy';
import { TransactionStatus } from 'src/shared/enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import {
  SweepDirection,
  SweepType,
} from '../interface/sweep-transfer.interface';

@Entity('sweep_payment_transactions')
export class SweepPaymentTransactions extends OwnerlessBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  sweepTransactionId: string;

  @Column({ type: 'uuid', nullable: true })
  businessId: string | null;

  @Column({ type: 'uuid', nullable: true })
  staticAccountId: string | null;

  @Column({ type: 'varchar', unique: true })
  reference: string;

  @Column({ type: 'bigint' })
  amount: string;

  @Column({ type: 'enum', enum: SweepType })
  type: SweepType;

  chargesIncured: string;

  @Column({ type: 'enum', enum: SweepDirection })
  direction: SweepDirection;

  @Column({ type: 'varchar' })
  fromAccount: string;

  @Column({ type: 'varchar' })
  toAccount: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.INITIATED,
  })
  status: TransactionStatus;

  @Column({ type: 'varchar' })
  provider: string;
}
