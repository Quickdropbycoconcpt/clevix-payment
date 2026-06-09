import { NonEnvironmentBaseEntity } from 'src/infrastructure/database/base_entiy';
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PermissionsEnum } from '../enums/business-member.enums';
import { BusinessRolePermission } from './business-role-permission.entity';

@Entity('permissions')
@Index(['key'], { unique: true })
export class Permission extends NonEnvironmentBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  permissionId: string;

  @Column({ enum: PermissionsEnum })
  key: PermissionsEnum;

  @Column({ type: 'varchar' })
  description: string;

  @OneToMany(
    () => BusinessRolePermission,
    (rolePermission) => rolePermission.permission,
  )
  rolePermissions: BusinessRolePermission[];
}
