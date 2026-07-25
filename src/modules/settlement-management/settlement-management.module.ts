import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettlementBankAccounts } from './entity/settlement_accounts.entity';
import { SettlementController } from './controller/settlement.controller';
import { SettlementService } from './service/settlement.account.service';
import { SettlementTransactions } from './entity/settlement_transactions.entity';
import { BusinessSettlementConfig } from './entity/business_settlement_config.entity';
import { BusinessSettlementConfigurationService } from './service/settlement_business_config.service';
import { SettlementTransactionsService } from './service/settlement-transactions.service';
import { SettlementAccountResolutionService } from './service/settlement-account-resolution.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SettlementBankAccounts,
      SettlementTransactions,
      BusinessSettlementConfig,
    ]),
  ],
  controllers: [SettlementController],
  providers: [
    SettlementService,
    BusinessSettlementConfigurationService,
    SettlementTransactionsService,
    SettlementAccountResolutionService,
  ],
  exports: [
    BusinessSettlementConfigurationService,
    SettlementTransactionsService,
    SettlementAccountResolutionService,
  ],
})
export class SettlementManagementModule {}
