import { Exclude } from 'class-transformer';
import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import { BusinessInformation } from 'src/modules/business-kyc/entity/business-information.entity';
import { Country } from 'src/modules/country-and-states/entity/country.entity';
import { LocalGovernment } from 'src/modules/country-and-states/entity/local-government.entity';
import { State } from 'src/modules/country-and-states/entity/state.entity';
import { KycStatus } from 'src/shared/enum';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
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

  @ManyToOne(() => State, (state) => state.businesses)
  @JoinColumn({ name: 'stateId' })
  state: State;

  @ManyToOne(() => LocalGovernment, (lga) => lga.businesses)
  @JoinColumn({ name: 'lgId' })
  lga: LocalGovernment;

  @OneToOne(() => BusinessInformation, (inf) => inf.business)
  info: BusinessInformation;
}
