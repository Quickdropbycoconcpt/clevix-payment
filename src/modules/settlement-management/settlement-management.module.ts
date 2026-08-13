import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettlementBankAccounts } from './entity/settlement_accounts.entity';
import { SettlementController } from './controller/settlement.controller';
import { SettlementService } from './service/settlement.account.service';
import { SettlementTransactions } from './entity/settlement_transactions.entity';
import { BusinessSettlementConfig } from './entity/business_settlement_config.entity';
import { BusinessSettlementConfigurationService } from './service/settlement_business_config.service';
import { SettlementTransactionsService } from './service/settlement-transactions.service';
import { SettlementAccountResolutionService } from './service/settlement-account-resolution.service';
import { SettlementTransactionItems } from './entity/settlement_transaction_items.entity';
import { SettlementPayoutAttempts } from './entity/settlement_payout_attempt.entity';
import { Settlements } from './entity/settlements.entity';
import { SettlementEngineService } from './service/settlement.engine.service';
import { SETTLEMENT_QUEUE } from './jobs/settlement.job';
import { SettlementQueue } from './jobs/settlement.queue';
import { SettlementProcessor } from './jobs/settlement.processor';
import { TransferAdapterFactory } from '../Api/transfers/adapters/transfer.adapter.factory';
import { VfdModule } from 'src/infrastructure/payments/providers/vfd/vfd.module';
import { Banks } from '../Api/banks/entity/banks.entity';
import { Wallets } from '../wallets/entity/wallet.entity';
import { WalletTransactions } from '../wallets/entity/wallet_transactions.entity';
import { FeesModule } from '../fees-configuration/fees.module';
import { TransactionModule } from '../transactions/transactions.module';
import { TransactionFeesModule } from '../transaction_fees/transaction-fees.module';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SettlementBankAccounts,
      Settlements,
      SettlementTransactions,
      SettlementTransactionItems,
      SettlementPayoutAttempts,
      BusinessSettlementConfig,
      Banks,
      Wallets,
      WalletTransactions,
    ]),
    BullModule.registerQueue({
      name: SETTLEMENT_QUEUE,
    }),
    VfdModule,
    FeesModule,
    TransactionModule,
    TransactionFeesModule,
    LedgerModule,
  ],
  controllers: [SettlementController],
  providers: [
    SettlementService,
    BusinessSettlementConfigurationService,
    SettlementTransactionsService,
    SettlementAccountResolutionService,
    SettlementEngineService,
    SettlementQueue,
    SettlementProcessor,
    TransferAdapterFactory,
  ],
  exports: [
    SettlementService,
    BusinessSettlementConfigurationService,
    SettlementTransactionsService,
    SettlementAccountResolutionService,
    SettlementEngineService,
    SettlementQueue,
  ],
})
export class SettlementManagementModule {}
