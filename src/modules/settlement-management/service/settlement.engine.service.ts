import { Repository } from 'typeorm';
import { SettlementTransactions } from '../entity/settlement_transactions.entity';
import { InjectRepository } from '@nestjs/typeorm';

export class SettlementEngineService {
  constructor(
    @InjectRepository(SettlementTransactions)
    private readonly settlementRepo: Repository<SettlementTransactions>,
  ) {}

  async settledPendingTransactions() {}
}
