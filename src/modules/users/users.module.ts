import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { UserService } from './service/user.service';
import { BusinessModule } from '../businesses/business.module';
import { WalletModule } from '../wallets/wallets.module';
import { BusinessMembersModule } from '../business-members/business-members.module';
import { CountryModule } from '../country-and-states/country.module';
import { UserController } from './controller/user.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    BusinessModule,
    BusinessMembersModule,
    WalletModule,
    CountryModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
