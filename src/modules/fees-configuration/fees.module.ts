import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessFeeConfiguration } from './entity/business_fee_config.entity';
import { PlatformFeeConfiguration } from './entity/platformFee_config.entity';
import { FeeConfigurationService } from './service/fees_revenue.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlatformFeeConfiguration,
      BusinessFeeConfiguration,
    ]),
  ],
  providers: [FeeConfigurationService],
  exports: [FeeConfigurationService],
})
export class FeesModule {}
