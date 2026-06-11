import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { CollectionSource, TransactionStatus } from 'src/shared/enum';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('collections')
export class Collection extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  collectionId: string;

  @Column({ type: 'varchar', nullable: true })
  senderBank: string;

  @Column({ type: 'varchar', nullable: true })
  bankCode: string;

  @Column({ type: 'varchar' })
  currency: string;

  @Column({ type: 'bigint' })
  amount: string;

  @Column({ type: 'enum', enum: CollectionSource })
  source: CollectionSource;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  reference: string;

  @Column({ type: 'varchar' })
  provider: string;

  @Column({ type: 'enum', enum: TransactionStatus })
  status: TransactionStatus;

  @Column({ type: 'varchar', nullable: true })
  transactionId: string;

  @Column({ type: 'varchar', nullable: true })
  sessionId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
