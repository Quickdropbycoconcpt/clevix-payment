import { DataSource } from 'typeorm';
import AppDataSource from '../database/typeorm.data-source';
import { Providers } from '../../modules/Api/providers/entity/providers.entity';
import { CollectionProvider } from '../../modules/Api/collection/adapters/contracts/collection-adapter.types';
import { ProviderServiceType } from '../../shared/enum';

const FCMB = { name: 'FCMB', value: CollectionProvider.FCMB };
const VFD = { name: 'VFD', value: CollectionProvider.VFD };
const MONNIFY = { name: 'Monnify', value: CollectionProvider.MONNIFY };

export const providersSeed = [
  { ...VFD, serviceType: ProviderServiceType.TRANSFER, isActive: false },
  { ...MONNIFY, serviceType: ProviderServiceType.TRANSFER, isActive: true },

  { ...VFD, serviceType: ProviderServiceType.VIRTUAL_ACCOUNT, isActive: true },
  {
    ...MONNIFY,
    serviceType: ProviderServiceType.VIRTUAL_ACCOUNT,
    isActive: false,
  },
  { ...FCMB, serviceType: ProviderServiceType.VIRTUAL_ACCOUNT, isActive: false },

  { ...VFD, serviceType: ProviderServiceType.CARD, isActive: true },
  { ...MONNIFY, serviceType: ProviderServiceType.CARD, isActive: false },
  { ...FCMB, serviceType: ProviderServiceType.CARD, isActive: false },

  { ...VFD, serviceType: ProviderServiceType.POS, isActive: true },
  { ...FCMB, serviceType: ProviderServiceType.POS, isActive: false },
];

export async function seedProviders(
  dataSource: DataSource = AppDataSource,
): Promise<void> {
  const shouldDestroyDataSource = !dataSource.isInitialized;

  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  try {
    console.log('Seeding providers...');

    await dataSource.transaction(async (manager) => {
      for (const providerData of providersSeed) {
        const existingProvider = await manager.findOne(Providers, {
          where: {
            value: providerData.value,
            serviceType: providerData.serviceType,
          },
          withDeleted: true,
        });

        if (existingProvider) {
          manager.merge(Providers, existingProvider, {
            name: providerData.name,
            deletedAt: null,
          });
          await manager.save(existingProvider);
        } else {
          await manager.save(manager.create(Providers, providerData));
        }

        console.log(`  ✓ ${providerData.serviceType} ${providerData.value}`);
      }
    });

    console.log(`Providers seeded: ${providersSeed.length}`);
  } finally {
    if (shouldDestroyDataSource) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  seedProviders().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
