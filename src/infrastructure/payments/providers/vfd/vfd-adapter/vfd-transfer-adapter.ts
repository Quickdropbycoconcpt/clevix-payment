import { NairaTransferAdapter } from 'src/modules/Api/transfers/adapters/contracts/transfer.adapter';

export class VfdTransferAdapter implements NairaTransferAdapter {
  processPaypout() {
    throw new Error('Method not implemented.');
  }
  transactionStatusQuery() {
    throw new Error('Method not implemented.');
  }
}
