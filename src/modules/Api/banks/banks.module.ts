import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VfdModule } from 'src/infrastructure/payments/providers/vfd/vfd.module';
import { MonnifyModule } from 'src/infrastructure/payments/providers/monnify/monnify.module';
import { Country } from 'src/modules/country-and-states/entity/country.entity';
import { BanksAdapterFactory } from './banks-adapter-factory';
import { BanksController } from './controller/banks.controller';
import { Banks } from './entity/banks.entity';
import { ProviderBank } from './entity/provider-bank.entity';
import { BanksService } from './service/banks.service';
import { ProvidersManagementModule } from '../providers/providers.management.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Banks, ProviderBank, Country]),
    VfdModule,
    MonnifyModule,
    ProvidersManagementModule,
  ],
  controllers: [BanksController],
  providers: [BanksAdapterFactory, BanksService],
  exports: [BanksService],
})
export class BanksModule {}
