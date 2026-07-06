import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VfdModule } from 'src/infrastructure/payments/providers/vfd/vfd.module';
import { BusinessModule } from 'src/modules/businesses/business.module';
import { TransactionModule } from 'src/modules/transactions/transactions.module';
import { WalletModule } from 'src/modules/wallets/wallets.module';
import { CollectionAdapterFactory } from '../adapters/collection.adapter.factory';
import { PosController } from './controllers/pos.controllers';
import { PosTransactions } from './entity/pos_transactions.entity';
import { Terminal } from './entity/terminals.entity';
import { PosService } from './service/pos.service';
import { PosTerminalService } from './service/pos_terminal.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PosTransactions, Terminal]),
    VfdModule,
    WalletModule,
    TransactionModule,
    BusinessModule,
  ],
  controllers: [PosController],
  providers: [CollectionAdapterFactory, PosService, PosTerminalService],
})
export class PosModule {}
