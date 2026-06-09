import { DataSource, EntityManager } from 'typeorm';
import AppDataSource from '../database/typeorm.data-source';
import { PermissionsEnum } from '../../modules/business-members/enums/business-member.enums';
import { Permission } from '../../modules/business-members/entity/permission.entity';

export const permissionsSeed = [
  {
    key: PermissionsEnum.KEY_VIEW,
    description: 'Permission to view api keys',
  },
  {
    key: PermissionsEnum.KEY_CREATE,
    description: 'Permission to view api keys',
  },
];

const upsertPermission = async (
  manager: EntityManager,
  permissionData: (typeof permissionsSeed)[number],
): Promise<Permission> => {
  const existingPermission = await manager.findOne(Permission, {
    where: { key: permissionData.key },
  });

  if (existingPermission) {
    manager.merge(Permission, existingPermission, {
      description: permissionData.description,
    });

    return manager.save(existingPermission);
  }

  const permission = manager.create(Permission, permissionData);

  return manager.save(permission);
};

export async function seedPermissions(
  dataSource: DataSource = AppDataSource,
): Promise<void> {
  const shouldDestroyDataSource = !dataSource.isInitialized;

  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  try {
    console.log('Seeding permissions...');

    await dataSource.transaction(async (manager) => {
      for (const permissionData of permissionsSeed) {
        await upsertPermission(manager, permissionData);
        console.log(`  ✓ ${permissionData.key}`);
      }
    });

    console.log(`Permissions seeded: ${permissionsSeed.length}`);
  } finally {
    if (shouldDestroyDataSource) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  seedPermissions().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
