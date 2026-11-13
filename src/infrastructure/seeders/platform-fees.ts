import { DataSource } from 'typeorm';
import AppDataSource from '../database/typeorm.data-source';
import { PlatformFeeConfiguration } from '../../modules/fees-configuration/entity/platformFee_config.entity';
import { CollectionProvider } from '../../modules/Api/collection/adapters/contracts/collection-adapter.types';
import { CollectionChannel, TransactionSource } from '../../shared/enum';

const TRANSFER_FEE = {
  useFlatFee: true,
  platformflatFee: 15,
  platformPercentageFee: 0,
  PlatformPercentageFeeCap: 0,
};

const COLLECTION_FEE = {
  useFlatFee: false,
  platformflatFee: 200,
  platformPercentageFee: 0.015,
  PlatformPercentageFeeCap: 2000,
};

const feeBySource: Record<string, typeof TRANSFER_FEE> = {
  [TransactionSource.TRANSFER]: TRANSFER_FEE,
  [CollectionChannel.VIRTUAL_ACCOUNT]: COLLECTION_FEE,
  [CollectionChannel.POS]: COLLECTION_FEE,
  [CollectionChannel.DEBIT_CARD]: COLLECTION_FEE,
};

type ProviderCost = {
  providerflatFee: number;
  providerPercentageFee: number;
  providerPercentageFeeCap: number;
};

const NO_COST: ProviderCost = {
  providerflatFee: 0,
  providerPercentageFee: 0,
  providerPercentageFeeCap: 0,
};

const providerCosts: Record<
  string,
  { transfer: ProviderCost; collection: ProviderCost }
> = {
  [CollectionProvider.VFD]: {
    transfer: { ...NO_COST, providerflatFee: 10 },
    collection: {
      ...NO_COST,
      providerPercentageFee: 0.003,
      providerPercentageFeeCap: 100,
    },
  },
  [CollectionProvider.MONNIFY]: {
    transfer: { ...NO_COST, providerflatFee: 10 },
    collection: {
      ...NO_COST,
      providerPercentageFee: 0.015,
      providerPercentageFeeCap: 2000,
    },
  },
  [CollectionProvider.FCMB]: { transfer: NO_COST, collection: NO_COST },
};

const providers = Object.keys(providerCosts);

const getProviderCost = (provider: string, feeSource: string): ProviderCost =>
  feeSource === TransactionSource.TRANSFER
    ? providerCosts[provider].transfer
    : providerCosts[provider].collection;

export async function seedPlatformFees(
  dataSource: DataSource = AppDataSource,
): Promise<void> {
  const shouldDestroyDataSource = !dataSource.isInitialized;

  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  try {
    console.log('Seeding platform fee configuration...');

    await dataSource.transaction(async (manager) => {
      const existing = await manager.find(PlatformFeeConfiguration);
      const existingKeys = new Set(
        existing.map((fee) => `${fee.provider}:${fee.feeSource}`),
      );

      const missing = providers.flatMap((provider) =>
        Object.entries(feeBySource)
          .filter(([feeSource]) => !existingKeys.has(`${provider}:${feeSource}`))
          .map(([feeSource, fee]) =>
            manager.create(PlatformFeeConfiguration, {
              provider,
              feeSource,
              ...fee,
              ...getProviderCost(provider, feeSource),
            }),
          ),
      );

      if (missing.length > 0) {
        await manager.save(missing);
      }

      missing.forEach((fee) =>
        console.log(`  ✓ ${fee.provider} ${fee.feeSource}`),
      );
      console.log(
        `Platform fees seeded: ${missing.length} created, ${
          providers.length * Object.keys(feeBySource).length - missing.length
        } already present`,
      );
    });
  } finally {
    if (shouldDestroyDataSource) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  seedPlatformFees().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
