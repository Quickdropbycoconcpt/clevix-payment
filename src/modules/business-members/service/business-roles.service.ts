import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { BusinessRolePermission } from '../entity/business-role-permission.entity';
import { BusinessRole } from '../entity/business-role.entity';
import { Permission } from '../entity/permission.entity';
import { PermissionsEnum } from '../enums/business-member.enums';

type CreateBusinessRoleInput = {
  businessId: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  permissionKeys?: PermissionsEnum[];
};

const BUSINESS_OWNER_ROLE_NAME = 'Business Owner';

@Injectable()
export class BusinessRolesService {
  constructor(
    @InjectRepository(BusinessRole)
    private readonly businessRoleRepo: Repository<BusinessRole>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(BusinessRolePermission)
    private readonly rolePermissionRepo: Repository<BusinessRolePermission>,
  ) {}

  async createBusinessRole(
    input: CreateBusinessRoleInput,
    entityManager?: EntityManager,
  ): Promise<BusinessRole> {
    const roleRepo =
      entityManager?.getRepository(BusinessRole) ?? this.businessRoleRepo;
    const permissionRepo =
      entityManager?.getRepository(Permission) ?? this.permissionRepo;
    const rolePermissionRepo =
      entityManager?.getRepository(BusinessRolePermission) ??
      this.rolePermissionRepo;

    const permissionKeys = input.permissionKeys ?? [];
    const permissions = permissionKeys.length
      ? await permissionRepo.find({
          where: {
            key: In(permissionKeys),
          },
        })
      : [];

    if (permissions.length !== permissionKeys.length) {
      throw new BadRequestException('One or more permissions do not exist');
    }

    const role = roleRepo.create({
      businessId: input.businessId,
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      isDefault: input.isDefault ?? false,
    });

    const savedRole = await roleRepo.save(role);

    if (permissions.length) {
      const rolePermissions = permissions.map((permission) =>
        rolePermissionRepo.create({
          roleId: savedRole.roleId,
          permissionId: permission.permissionId,
        }),
      );

      await rolePermissionRepo.save(rolePermissions);
    }

    return this.findBusinessRoleById(savedRole.roleId, entityManager);
  }

  async createAdminRoleWithAllPermissions(
    businessId: string,
    entityManager?: EntityManager,
  ): Promise<BusinessRole> {
    const roleRepo =
      entityManager?.getRepository(BusinessRole) ?? this.businessRoleRepo;
    const permissionRepo =
      entityManager?.getRepository(Permission) ?? this.permissionRepo;
    const rolePermissionRepo =
      entityManager?.getRepository(BusinessRolePermission) ??
      this.rolePermissionRepo;

    const permissions = await permissionRepo.find();

    if (!permissions.length) {
      throw new BadRequestException(
        'Permissions must be seeded before creating business roles',
      );
    }

    let role = await roleRepo.findOne({
      where: {
        businessId,
        name: BUSINESS_OWNER_ROLE_NAME,
      },
    });

    if (!role) {
      role = await roleRepo.save(
        roleRepo.create({
          businessId,
          name: BUSINESS_OWNER_ROLE_NAME,
          description: 'Owner role with access to all business permissions',
          isDefault: true,
        }),
      );
    }

    const existingRolePermissions = await rolePermissionRepo.find({
      where: {
        roleId: role.roleId,
      },
    });
    const existingPermissionIds = new Set(
      existingRolePermissions.map(
        (rolePermission) => rolePermission.permissionId,
      ),
    );
    const missingRolePermissions = permissions
      .filter(
        (permission) => !existingPermissionIds.has(permission.permissionId),
      )
      .map((permission) =>
        rolePermissionRepo.create({
          roleId: role.roleId,
          permissionId: permission.permissionId,
        }),
      );

    if (missingRolePermissions.length) {
      await rolePermissionRepo.save(missingRolePermissions);
    }

    return this.findBusinessRoleById(role.roleId, entityManager);
  }

  async findBusinessRoleById(
    roleId: string,
    entityManager?: EntityManager,
  ): Promise<BusinessRole> {
    const roleRepo =
      entityManager?.getRepository(BusinessRole) ?? this.businessRoleRepo;
    const role = await roleRepo.findOne({
      where: { roleId },
      relations: {
        permissions: {
          permission: true,
        },
      },
    });

    if (!role) {
      throw new BadRequestException('Business role not found');
    }

    return role;
  }

  async findBusinessRoles(businessId: string): Promise<BusinessRole[]> {
    return this.businessRoleRepo.find({
      where: { businessId },
      relations: {
        permissions: {
          permission: true,
        },
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async getUserPermissionInBusiness(roleId: string) {
    return await this.rolePermissionRepo.find({
      where: {
        roleId,
      },
      relations: {
        permission: true,
      },
    });
  }
}
