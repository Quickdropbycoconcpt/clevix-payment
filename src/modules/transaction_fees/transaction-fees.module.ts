import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionFees } from './entity/transaction_fees.entity';
import { TransactionFeesService } from './service/transaction_fees.service';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionFees])],
  providers: [TransactionFeesService],
  exports: [TransactionFeesService],
})
export class TransactionFeesModule {}
