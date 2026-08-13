import { Global, Module } from '@nestjs/common';
import { FeatureManagementService } from './service/feature-management.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessAllowedFeatures } from './entity/business-feature.entity';
import { PlatFormFeatures } from './entity/platform-feature.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([BusinessAllowedFeatures, PlatFormFeatures]),
  ],
  providers: [FeatureManagementService],
  exports: [FeatureManagementService],
})
export class FeatureManagementModule {}
