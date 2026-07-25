import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { VfdModule } from 'src/infrastructure/payments/providers/vfd/vfd.module';
import { CollectionAdapterFactory } from '../adapters/collection.adapter.factory';
import { VirtualAccountsController } from './controllers/virtual-accounts.controllers';
import { VirtualAccountsService } from './service/virtual-accounts.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DynamicVirtualAccounts } from './entity/dynamic_va.entity';
import { VIRTUAL_ACCOUNT_CREDIT_QUEUE } from './jobs/virtual-account-credit.job';
import { VirtualAccountCreditProcessor } from './jobs/virtual-account-credit.processor';
import { VirtualAccountCreditQueue } from './jobs/virtual-account-credit.queue';
import { WalletModule } from 'src/modules/wallets/wallets.module';
import { TransactionModule } from 'src/modules/transactions/transactions.module';
import { ReconciliationModule } from 'src/modules/reconciliation/reconciliation.module';
import { StaticWalletAccounts } from './entity/wallet_account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DynamicVirtualAccounts, StaticWalletAccounts]),
    BullModule.registerQueue({
      name: VIRTUAL_ACCOUNT_CREDIT_QUEUE,
    }),
    VfdModule,
    TransactionModule,
    WalletModule,
    ReconciliationModule,
  ],
  controllers: [VirtualAccountsController],
  providers: [
    CollectionAdapterFactory,
    VirtualAccountsService,
    VirtualAccountCreditQueue,
    VirtualAccountCreditProcessor,
  ],
  exports: [VirtualAccountsService],
})
export class VirtualAccountsModule {}
