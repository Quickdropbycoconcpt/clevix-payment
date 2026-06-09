import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BusinessRole } from './business-role.entity';
import { Permission } from './permission.entity';

@Entity('business_role_permissions')
@Index(['roleId', 'permissionId'], { unique: true })
export class BusinessRolePermission extends NonEnvironmentBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  rolePermissionId: string;

  @Column({ type: 'uuid' })
  roleId: string;

  @Column({ type: 'uuid' })
  permissionId: string;

  @ManyToOne(() => BusinessRole, (role) => role.permissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roleId' })
  role: BusinessRole;

  @ManyToOne(() => Permission, (permission) => permission.rolePermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'permissionId' })
  permission: Permission;
}
