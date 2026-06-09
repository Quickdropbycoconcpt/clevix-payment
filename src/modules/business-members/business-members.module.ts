import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessMember } from './entity/business-member.entity';
import { BusinessRolePermission } from './entity/business-role-permission.entity';
import { BusinessRole } from './entity/business-role.entity';
import { Permission } from './entity/permission.entity';
import { BusinessMembersService } from './service/business-members.service';
import { BusinessRolesService } from './service/business-roles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BusinessMember,
      BusinessRole,
      BusinessRolePermission,
      Permission,
    ]),
  ],
  providers: [BusinessMembersService, BusinessRolesService],
  exports: [BusinessMembersService, BusinessRolesService],
})
export class BusinessMembersModule {}
