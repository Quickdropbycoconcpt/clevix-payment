import { Module } from '@nestjs/common';
import { TransferController } from './controller/transfer.controller';
import { TransferService } from './service/transfer.service';
import { TransferAdapterFactory } from './adapters/transfer.adapter.factory';
import { WalletModule } from 'src/modules/wallets/wallets.module';
import { TransactionModule } from 'src/modules/transactions/transactions.module';
import { VfdModule } from 'src/infrastructure/payments/providers/vfd/vfd.module';
import { AddTransferIntoQue } from './job/transfer-queue-job';
import { BullModule } from '@nestjs/bullmq';
import { JobQueueList } from 'src/shared/enum';
import { TransferJobProccessor } from './job/transfer-payout-proccessor';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletTransactions } from 'src/modules/wallets/entity/wallet_transactions.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletTransactions]),
    WalletModule,
    TransactionModule,
    VfdModule,
    BullModule.registerQueue({
      name: JobQueueList.MONEY_TRANSFER_PROCESSOR,
    }),
  ],
  controllers: [TransferController],
  providers: [
    TransferAdapterFactory,
    TransferService,
    AddTransferIntoQue,
    TransferJobProccessor,
  ],
})
export class TransferModule {}
