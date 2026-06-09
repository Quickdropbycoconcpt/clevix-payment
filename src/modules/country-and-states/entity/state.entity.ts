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
import { Country } from './country.entity';
import { LocalGovernment } from './local-government.entity';

@Entity('states')
@Index(['countryId', 'name'], { unique: true })
export class State extends NonEnvironmentBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  stateId: string;

  @Column({ type: 'uuid' })
  countryId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  code: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Country, (country) => country.states, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'countryId', referencedColumnName: 'countryId' })
  country: Country;

  @OneToMany(() => LocalGovernment, (localGovernment) => localGovernment.state)
  localGovernments: LocalGovernment[];
}
