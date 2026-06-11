import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { TransactionStatus } from 'src/shared/enum';
import { Column, Index, PrimaryGeneratedColumn } from 'typeorm';

export class Payout extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  payoutId: string;

  @Column({ type: 'varchar' })
  destinationBankName: string;

  @Column({ type: 'varchar' })
  bankCode: string;

  @Column({ type: 'varchar' })
  currency: string;

  @Column({ type: 'bigint' })
  amount: string;

  @Column({ type: 'varchar' })
  provider: string;

  @Column({ type: 'enum', enum: TransactionStatus })
  status: TransactionStatus;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  reference: string;

  @Column({ type: 'varchar', nullable: true })
  transactionId: string;

  @Column({ type: 'varchar', nullable: true })
  sessionId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
