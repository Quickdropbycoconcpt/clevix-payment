import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('IDX_providers_value_service_type', ['value', 'serviceType'], {
  unique: true,
})
@Index('IDX_providers_one_active_per_service', ['serviceType'], {
  unique: true,
  where: '"isActive" = true AND "deletedAt" IS NULL',
})
@Entity('providers')
export class Providers extends NonEnvironmentBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  providerId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  serviceType: string;

  @Column({ type: 'varchar' })
  value: string;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;
}
