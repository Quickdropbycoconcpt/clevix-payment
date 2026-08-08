import { Module } from '@nestjs/common';
import { BanksModule as ApiBanksModule } from 'src/modules/Api/banks/banks.module';
import { DashboardBanksController } from './controller/banks.controller';

@Module({
  imports: [ApiBanksModule],
  controllers: [DashboardBanksController],
})
export class DashboardBanksModule {}
