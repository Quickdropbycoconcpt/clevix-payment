import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VfdModule } from 'src/infrastructure/payments/providers/vfd/vfd.module';
import { Country } from 'src/modules/country-and-states/entity/country.entity';
import { BanksAdapterFactory } from './banks-adapter-factory';
import { BanksController } from './controller/banks.controller';
import { Banks } from './entity/banks.entity';
import { BanksService } from './service/banks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Banks, Country]), VfdModule],
  controllers: [BanksController],
  providers: [BanksAdapterFactory, BanksService],
  exports: [BanksService],
})
export class BanksModule {}
