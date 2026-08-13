import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsController } from './controllers/tansactions.controller';
import { Transactions } from './entity/transaction.entity';
import { TransactionService } from './service/transaction.service';
import { TransactionsServiceListing } from './service/list-transactions.service';
import { DashboardTransactionsController } from './controllers/dashboard.transactions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Transactions])],
  controllers: [TransactionsController, DashboardTransactionsController],
  providers: [TransactionService, TransactionsServiceListing],
  exports: [TransactionService],
})
export class TransactionModule {}
