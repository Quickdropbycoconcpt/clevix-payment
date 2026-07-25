import { BaseEntity } from 'src/infrastructure/database/base_entiy';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OrganizationService } from './service_definition.entity';

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

  @Column({ type: 'varchar' })
  settlementAccountId: string;

  @ManyToOne(() => OrganizationService, (service) => service.items)
  service: OrganizationService;
}
