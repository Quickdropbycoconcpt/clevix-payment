import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerAccount } from './entity/ledger-account.entity';
import { LedgerEntry } from './entity/ledger-entry.entity';
import { LedgerTransaction } from './entity/ledger-transaction.entity';
import { LedgerService } from './service/ledger.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LedgerAccount, LedgerEntry, LedgerTransaction]),
  ],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
