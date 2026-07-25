import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { Businesses } from 'src/modules/businesses/entity/business.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('keys')
@Index(['clientId'])
export class Key extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  keyId: string;

  @Column({ type: 'varchar' })
  clientId: string;

  @Column({ type: 'varchar' })
  keyHash: string;

  @ManyToOne(() => Businesses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Businesses;
}
