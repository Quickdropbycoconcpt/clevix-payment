import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

type DatabaseEnv = Record<string, string | undefined>;

const stringValue = (
  value: string | undefined,
  fallback?: string,
): string | undefined => {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  return value;
};

const numberValue = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
};

const booleanValue = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const databaseEnvFromConfig = (config: ConfigService): DatabaseEnv => ({
  DATABASE_URL: config.get<string>('DATABASE_URL'),
  DATABASE_HOST: config.get<string>('DATABASE_HOST'),
  DATABASE_PORT: config.get<string>('DATABASE_PORT'),
  DATABASE_USER: config.get<string>('DATABASE_USER'),
  DATABASE_PASSWORD: config.get<string>('DATABASE_PASSWORD'),
  DATABASE_NAME: config.get<string>('DATABASE_NAME'),
  DATABASE_SSL: config.get<string>('DATABASE_SSL'),
  DATABASE_SSL_REJECT_UNAUTHORIZED: config.get<string>(
    'DATABASE_SSL_REJECT_UNAUTHORIZED',
  ),
  DATABASE_SYNCHRONIZE: config.get<string>('DATABASE_SYNCHRONIZE'),
  DATABASE_MIGRATIONS_RUN: config.get<string>('DATABASE_MIGRATIONS_RUN'),
  DATABASE_LOGGING: config.get<string>('DATABASE_LOGGING'),
  DATABASE_POOL_MAX: config.get<string>('DATABASE_POOL_MAX'),
  DATABASE_RETRY_ATTEMPTS: config.get<string>('DATABASE_RETRY_ATTEMPTS'),
  DATABASE_RETRY_DELAY: config.get<string>('DATABASE_RETRY_DELAY'),
});

export const buildDataSourceOptions = (
  env: DatabaseEnv = process.env,
): DataSourceOptions => {
  const sslEnabled = booleanValue(env.DATABASE_SSL);
  const baseOptions = {
    type: 'postgres' as const,
    entities: [join(__dirname, '../../**/*.entity{.ts,.js}')],
    migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
    synchronize: booleanValue(env.DATABASE_SYNCHRONIZE),
    migrationsRun: booleanValue(env.DATABASE_MIGRATIONS_RUN),
    logging: booleanValue(env.DATABASE_LOGGING),
    ssl: sslEnabled
      ? {
          rejectUnauthorized: booleanValue(
            env.DATABASE_SSL_REJECT_UNAUTHORIZED,
            true,
          ),
        }
      : false,
    extra: {
      max: numberValue(env.DATABASE_POOL_MAX, 10),
    },
  };
  console.log(env.DATABASE_URL, 'HI url');
  const databaseUrl = stringValue(env.DATABASE_URL);

  if (databaseUrl) {
    return {
      ...baseOptions,
      url: databaseUrl,
    };
  }

  return {
    ...baseOptions,
    host: stringValue(env.DATABASE_HOST, 'localhost'),
    port: numberValue(env.DATABASE_PORT, 5432),
    username: stringValue(env.DATABASE_USER, 'postgres'),
    password: stringValue(env.DATABASE_PASSWORD, 'postgres'),
    database: stringValue(env.DATABASE_NAME, 'clevix_payments'),
  };
};

export const buildTypeOrmModuleOptions = (
  config: ConfigService,
): TypeOrmModuleOptions => {
  const env = databaseEnvFromConfig(config);

  return {
    ...buildDataSourceOptions(env),
    autoLoadEntities: true,
    retryAttempts: numberValue(env.DATABASE_RETRY_ATTEMPTS, 5),
    retryDelay: numberValue(env.DATABASE_RETRY_DELAY, 3000),
  };
};
