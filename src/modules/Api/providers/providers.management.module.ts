import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Providers } from './entity/providers.entity';
import { ProviderService } from './service/providers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Providers])],
  providers: [ProviderService],
  exports: [ProviderService],
})
export class ProvidersManagementModule {}
