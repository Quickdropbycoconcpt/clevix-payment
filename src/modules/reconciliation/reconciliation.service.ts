import { Injectable } from '@nestjs/common';
import { TransactionService } from 'src/modules/transactions/service/transaction.service';
import { ReconciliationHandler } from './reconciliation-handler.interface';

@Injectable()
export class ReconciliationService {
  private readonly handlers: ReconciliationHandler[] = [];

  constructor(private readonly transactionService: TransactionService) {}

  registerHandler(handler: ReconciliationHandler): void {
    this.handlers.push(handler);
  }

  async reconcile(merchantRef: string): Promise<boolean> {
    const transaction =
      await this.transactionService.getTransactionByMerchantRef(merchantRef);

    if (!transaction) {
      return false;
    }

    for (const handler of this.handlers) {
      const handled = await handler.handle(merchantRef, transaction);

      if (handled) {
        return true;
      }
    }
  }
}
