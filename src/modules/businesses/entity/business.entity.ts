import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import { Country } from 'src/modules/country-and-states/entity/country.entity';
import { KycStatus } from 'src/shared/enum';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('businesses')
@Index(['businessIdentifier'], { unique: true })
export class Businesses extends NonEnvironmentBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  businessId: string;

  @Column('varchar')
  businessIdentifier: string;

  @Column({ type: 'varchar' })
  environment: string;

  @Column('varchar')
  businessName: string;

  @Column({ type: 'uuid' })
  countryId: string;

  @Column({ type: 'uuid', nullable: true })
  stateId: string;

  @Column({ type: 'enum', enum: KycStatus, default: KycStatus.PENDING })
  kycStatus: KycStatus;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  lgId: string;

  @Column({ type: 'varchar' })
  businessPhone: string;

  @Column('varchar')
  businessAddress: string;

  @ManyToOne(() => Country, (country) => country.businesses)
  @JoinColumn({ name: 'countryId' })
  country: Country;
}
