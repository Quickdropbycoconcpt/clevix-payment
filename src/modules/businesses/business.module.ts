import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Businesses } from './entity/business.entity';
import { BusinessService } from './service/business.service';
import { BusinessController } from './controller/business.controller';
import { User } from '../users/entity/user.entity';
import { CountryModule } from '../country-and-states/country.module';
import { WalletModule } from '../wallets/wallets.module';
import { BusinessMembersModule } from '../business-members/business-members.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Businesses, User]),
    BusinessMembersModule,
    CountryModule,
    WalletModule,
  ],
  controllers: [BusinessController],
  providers: [BusinessService],
  exports: [BusinessService],
})
export class BusinessModule {}
