import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transactions } from './entity/transaction.entity';
import { TransactionService } from './service/transaction.service';

@Module({
  imports: [TypeOrmModule.forFeature([Transactions])],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
