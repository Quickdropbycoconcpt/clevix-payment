import { Injectable } from '@nestjs/common';
import { TransferProvider } from '../types/transfer-provider';
import { WalletService } from 'src/modules/wallets/service/wallets.service';
import { WithdrawalDto } from '../dto/transfer.dto';
import { RequestScope } from 'src/shared/business-scope';
import { TransactionSource } from 'src/shared/enum';
import { AddTransferIntoQue } from '../job/transfer-queue-job';

@Injectable()
export class TransferService {
  constructor(
    private readonly walletService: WalletService,
    private readonly transferQueue: AddTransferIntoQue,
  ) {}

  async processPayout(dto: WithdrawalDto, scope: RequestScope) {
    const {
      accountName,
      accountNumber,
      narration,
      currency,
      bankCode,
      reference,
      senderAccount,
      amount,
    } = dto;
    const { businessId, environment } = scope;
    const provider = TransferProvider.VFD; //this should be dynamic....
    /**
     * We determine the provider ourselves
     */
    const walletTransaction = await this.walletService.debitUserWallet({
      amount,
      environment,
      businessId,
      narration,
      source: TransactionSource.TRANSFER,
      provider,
      reference,
      currency,
    });

    await this.transferQueue.addTransferProcessingQueue({
      walletTransactionId: walletTransaction.walletTransactionId,
      accountName,
      accountNumber,
      narration,
      bankCode,
      environment,
      currency,
      senderAccount,
      provider,
      merchantReference: reference,
      reference,
      amount,
    });
  }
}
