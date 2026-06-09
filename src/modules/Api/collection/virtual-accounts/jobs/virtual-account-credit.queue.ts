import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  VIRTUAL_ACCOUNT_CREDIT_JOB,
  VIRTUAL_ACCOUNT_CREDIT_QUEUE,
  VirtualAccountCreditJobData,
} from './virtual-account-credit.job';

@Injectable()
export class VirtualAccountCreditQueue {
  constructor(
    @InjectQueue(VIRTUAL_ACCOUNT_CREDIT_QUEUE)
    private readonly queue: Queue<VirtualAccountCreditJobData>,
  ) {}

  async addCreditJob(data: VirtualAccountCreditJobData) {
    return this.queue.add(VIRTUAL_ACCOUNT_CREDIT_JOB, data, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
      jobId: data.credit.sessionId || data.credit.reference,
    });
  }
}
