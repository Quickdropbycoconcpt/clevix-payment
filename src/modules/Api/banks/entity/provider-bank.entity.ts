import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Banks } from './banks.entity';

@Entity('provider_banks')
@Index('IDX_provider_banks_provider_code', ['provider', 'bankCode'], {
  unique: true,
})
@Index('IDX_provider_banks_provider_bank', ['provider', 'bankId'], {
  unique: true,
  where: '"bankId" IS NOT NULL',
})
export class ProviderBank extends NonEnvironmentBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  providerBankId: string;

  @Column({ type: 'uuid', nullable: true })
  bankId: string | null;

  @ManyToOne(() => Banks, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'bankId', referencedColumnName: 'bankId' })
  bank: Banks | null;

  @Column({ type: 'varchar' })
  provider: string;

  @Column({ type: 'varchar' })
  bankCode: string;

  @Column({ type: 'varchar' })
  name: string;
}
