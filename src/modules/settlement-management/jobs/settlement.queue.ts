import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  SETTLEMENT_QUEUE,
  SETTLEMENT_TRANSACTION_JOB,
  SettlementTransactionJobData,
} from './settlement.job';

@Injectable()
export class SettlementQueue {
  constructor(
    @InjectQueue(SETTLEMENT_QUEUE)
    private readonly queue: Queue<SettlementTransactionJobData>,
  ) {}

  async addSettlementTransactionJob(data: SettlementTransactionJobData) {
    return this.queue.add(SETTLEMENT_TRANSACTION_JOB, data, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        age: 24 * 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
        count: 5000,
      },
      jobId: data.transactionId,
    });
  }
}
