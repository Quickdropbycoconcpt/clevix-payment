import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VfdModule } from 'src/infrastructure/payments/providers/vfd/vfd.module';
import { MonnifyModule } from 'src/infrastructure/payments/providers/monnify/monnify.module';
import { StaticWalletAccounts } from 'src/modules/Api/collection/virtual-accounts/entity/wallet_account.entity';
import { TransferAdapterFactory } from '../transfers/adapters/transfer.adapter.factory';
import { InternalCoporateAccount } from './entity/internal-accounts.entity';
import { SweepPaymentTransactions } from './entity/sweep-transactions.entity';
import { InternalPaymentSweepService } from './service/internal-payment-sweep.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StaticWalletAccounts,
      InternalCoporateAccount,
      SweepPaymentTransactions,
    ]),
    VfdModule,
    MonnifyModule,
  ],
  providers: [TransferAdapterFactory, InternalPaymentSweepService],
  exports: [InternalPaymentSweepService],
})
export class InternalPaymentSwipeModule {}
