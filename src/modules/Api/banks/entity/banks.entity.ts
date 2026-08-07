import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import { Country } from 'src/modules/country-and-states/entity/country.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('banks')
@Index(['countryId', 'bankCode'], { unique: true })
export class Banks extends NonEnvironmentBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  bankId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  bankCode: string;

  @Column({ type: 'uuid' })
  countryId: string;

  @ManyToOne(() => Country, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'countryId', referencedColumnName: 'countryId' })
  country: Country;
}
