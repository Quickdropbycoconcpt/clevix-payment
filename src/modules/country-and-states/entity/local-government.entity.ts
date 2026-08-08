import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { State } from './state.entity';
import { Businesses } from 'src/modules/businesses/entity/business.entity';

@Entity('local_governments')
@Index(['stateId', 'name'], { unique: true })
export class LocalGovernment extends NonEnvironmentBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  lgId: string;

  @Column({ type: 'uuid' })
  stateId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => State, (state) => state.localGovernments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'stateId', referencedColumnName: 'stateId' })
  state: State;

  @OneToMany(() => Businesses, (biz) => biz.lga)
  businesses: Businesses[];
}
