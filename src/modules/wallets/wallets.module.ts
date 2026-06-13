import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallets } from './entity/wallet.entity';
import { WalletService } from './service/wallets.service';
import { WalletController } from './controllers/wallet.controller';
import { LedgerModule } from '../ledger/ledger.module';
import { TransactionModule } from '../transactions/transactions.module';
import { FeesModule } from '../fees-configuration/fees.module';
import { TransactionFeesModule } from '../transaction_fees/transaction-fees.module';
import { WebhookModule } from '../webhooks/webhook.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallets]),
    LedgerModule,
    FeesModule,
    TransactionModule,
    TransactionFeesModule,
    WebhookModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
