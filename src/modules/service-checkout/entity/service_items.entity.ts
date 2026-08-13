import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrganizationService } from './service_definition.entity';
import { TaxConfiguration } from 'src/modules/tax-management/entity/tax-config.entity';

@Entity('service_items')
export class ServiceItems extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  itemId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'boolean', default: false })
  fixedPrice: boolean;

  @Column({ type: 'bigint', nullable: true })
  fixedAmount: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar' })
  settlementAccountId: string;

  @Column({ type: 'uuid', nullable: true })
  taxId: string | null;

  @ManyToOne(() => TaxConfiguration)
  @JoinColumn({ name: 'taxId' })
  tax: TaxConfiguration;

  @ManyToOne(() => OrganizationService, (service) => service.items)
  service: OrganizationService;
}
