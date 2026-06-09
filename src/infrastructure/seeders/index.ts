import { DataSource } from 'typeorm';
import AppDataSource from '../database/typeorm.data-source';
import { seedNigeria } from './nigeria';
import { seedPermissions } from './permissions';

type Seeder = {
  name: string;
  run: (dataSource: DataSource) => Promise<void>;
};

const seeders: Seeder[] = [
  {
    name: 'Permissions',
    run: seedPermissions,
  },
  {
    name: 'Nigeria country, states and LGAs',
    run: seedNigeria,
  },
];

export async function runSeeders(
  dataSource: DataSource = AppDataSource,
): Promise<void> {
  const shouldDestroyDataSource = !dataSource.isInitialized;

  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  try {
    for (const seeder of seeders) {
      console.log(`Running seeder: ${seeder.name}`);
      await seeder.run(dataSource);
    }

    console.log(`Seeders completed: ${seeders.length}`);
  } finally {
    if (shouldDestroyDataSource) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  runSeeders().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
