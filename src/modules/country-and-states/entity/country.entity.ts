import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { State } from './state.entity';
import { Businesses } from '../../../modules/businesses/entity/business.entity';

@Entity('countries')
export class Country extends NonEnvironmentBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  countryId: string;

  @Column({ type: 'varchar' })
  @Index({ unique: true })
  name: string;

  @Column({ type: 'varchar' })
  @Index({ unique: true })
  countryCode: string;

  @Column({ type: 'varchar', nullable: true })
  phoneCode: string;

  @Column({ type: 'varchar', nullable: true })
  currency: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => State, (state) => state.country)
  states: State[];

  @OneToMany(() => Businesses, (business) => business.country)
  businesses: Businesses[];
}
