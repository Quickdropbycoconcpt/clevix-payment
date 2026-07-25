import { Module } from '@nestjs/common';
import { TransactionModule } from 'src/modules/transactions/transactions.module';
import { ReconciliationService } from './reconciliation.service';

@Module({
  imports: [TransactionModule],
  providers: [ReconciliationService],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
