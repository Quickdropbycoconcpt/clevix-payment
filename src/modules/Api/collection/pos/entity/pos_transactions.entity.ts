import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { PosChargePurpose, TransactionStatus } from 'src/shared/enum';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pos_transactions')
export class PosTransactions extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  posTransactionId: string;

  @Column({ type: 'uuid' })
  businessId: string;

  @Column({ type: 'varchar', nullable: true })
  merchantIdentifier: string;

  @Column({ type: 'enum', enum: PosChargePurpose, nullable: true })
  purpose: PosChargePurpose;

  @Column({ type: 'varchar', nullable: true })
  terminalSerialNumber: string;

  @Column({ type: 'varchar', nullable: true })
  accountOrItemId: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  rrn: string;

  @Column({ type: 'varchar' })
  stan: string;

  @Column({ type: 'bigint' })
  amount: string;

  @Index()
  @Column({ type: 'varchar' })
  reference: string;

  @Column({ type: 'varchar', nullable: true })
  lastFour: string;

  @Column({ type: 'varchar', nullable: true })
  firstSixDigit: string;

  @Column({ type: 'enum', enum: TransactionStatus })
  status: TransactionStatus;

  @Column({ type: 'varchar', nullable: true })
  cardType: string;

  @Column({ type: 'varchar', nullable: true })
  terminalId: string;

  @Column({ type: 'varchar', nullable: true })
  description: string;
}
