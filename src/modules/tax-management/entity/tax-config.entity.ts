import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BasicStatus, TaxCollectionMode, TaxPayer } from 'src/shared/enum';
import { Country } from 'src/modules/country-and-states/entity/country.entity';
import { State } from 'src/modules/country-and-states/entity/state.entity';
import { LocalGovernment } from 'src/modules/country-and-states/entity/local-government.entity';

@Entity('tax_configurations')
@Index(['countryId'])
@Index(['stateId'])
@Index(['lgId'])
@Index(['collectionMode'])
@Index(['status'])
export class TaxConfiguration extends NonEnvironmentBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  taxId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  rate: number;

  @Column({
    type: 'enum',
    enum: TaxCollectionMode,
    default: TaxCollectionMode.PLATFORM_WITHHELD,
  })
  collectionMode: TaxCollectionMode;

  @Column({
    type: 'enum',
    enum: TaxPayer,
    default: TaxPayer.CUSTOMER,
  })
  payer: TaxPayer;

  @Column({
    type: 'enum',
    enum: BasicStatus,
    default: BasicStatus.ACTIVE,
  })
  status: BasicStatus;

  @Column({ type: 'uuid' })
  countryId: string;

  @ManyToOne(() => Country)
  @JoinColumn({ name: 'countryId' })
  country: Country;

  @Column({ type: 'uuid', nullable: true })
  stateId: string | null;

  @ManyToOne(() => State)
  @JoinColumn({ name: 'stateId' })
  state: State;

  @Column({ type: 'uuid', nullable: true })
  lgId: string | null;

  @ManyToOne(() => LocalGovernment)
  @JoinColumn({ name: 'lgId' })
  localGovernment: LocalGovernment;
}
