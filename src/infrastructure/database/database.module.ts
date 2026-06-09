import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmModuleOptions } from './typeorm.config';

@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    if (process.env.DATABASE_ENABLED === 'false') {
      return {
        module: DatabaseModule,
      };
    }

    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: buildTypeOrmModuleOptions,
        }),
      ],
      exports: [TypeOrmModule],
    };
  }
}
