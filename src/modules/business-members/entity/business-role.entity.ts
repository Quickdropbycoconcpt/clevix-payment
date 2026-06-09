import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import { Businesses } from 'src/modules/businesses/entity/business.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BusinessRolePermission } from './business-role-permission.entity';

@Entity('business_roles')
@Index(['businessId', 'name'], { unique: true })
export class BusinessRole extends NonEnvironmentBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  roleId: string;

  @Column({ type: 'uuid' })
  businessId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @ManyToOne(() => Businesses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Businesses;

  @OneToMany(() => BusinessRolePermission, (permission) => permission.role)
  permissions: BusinessRolePermission[];
}
