import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { BasicStatus } from 'src/shared/enum';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('dynamic_virtual_accounts')
@Index(['accountNumber', 'provider', 'status'], { unique: true })
export class DynamicVirtualAccounts extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  dvaId: string;

  @Column({ type: 'varchar' })
  accountNumber: string;

  @Column({ type: 'enum', enum: BasicStatus, default: BasicStatus.ACTIVE })
  status: BasicStatus;

  @Column({ type: 'varchar' })
  provider: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  merchantReference: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  reference: string;

  @Column({ type: 'int', default: 2400 })
  validityTime: number;

  @Column({ type: 'bigint', nullable: true })
  feeCharged: string;
}
