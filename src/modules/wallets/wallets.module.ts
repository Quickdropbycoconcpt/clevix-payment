import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallets } from './entity/wallet.entity';
import { WalletTransactions } from './entity/wallet_transactions.entity';
import { WalletService } from './service/wallets.service';
import { WalletTransactionsService } from './service/wallet.transactions.service';
import { WalletController } from './controllers/wallet.controller';
import { LedgerModule } from '../ledger/ledger.module';
import { TransactionModule } from '../transactions/transactions.module';
import { FeesModule } from '../fees-configuration/fees.module';
import { TransactionFeesModule } from '../transaction_fees/transaction-fees.module';
import { WebhookModule } from '../webhooks/webhook.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallets, WalletTransactions]),
    LedgerModule,
    FeesModule,
    TransactionModule,
    TransactionFeesModule,
    WebhookModule,
  ],
  controllers: [WalletController],
  providers: [WalletService, WalletTransactionsService],
  exports: [WalletService, WalletTransactionsService],
})
export class WalletModule {}
