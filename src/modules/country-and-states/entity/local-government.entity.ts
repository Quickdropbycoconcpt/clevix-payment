import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { State } from './state.entity';

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
}
