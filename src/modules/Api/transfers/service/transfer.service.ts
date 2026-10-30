import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransferProvider } from '../types/transfer-provider';
import { WalletService } from 'src/modules/wallets/service/wallets.service';
import { WithdrawalDto } from '../dto/transfer.dto';
import { getBusinessScope, RequestScope } from 'src/shared/business-scope';
import {
  RequestEnvironment,
  TransactionSource,
  WalletTransactionSource,
  WalletTransactionStatus,
} from 'src/shared/enum';
import { AddTransferIntoQue } from '../job/transfer-queue-job';
import { TransferAdapterFactory } from '../adapters/transfer.adapter.factory';
import { WalletTransactions } from 'src/modules/wallets/entity/wallet_transactions.entity';

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly transferQueue: AddTransferIntoQue,
    private readonly transferAdapterFactory: TransferAdapterFactory,
    @InjectRepository(WalletTransactions)
    private readonly walletTransactionRepo: Repository<WalletTransactions>,
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

  async getTransferStatus(reference: string, scope: RequestScope) {
    const { businessId, environment } = getBusinessScope(scope);

    const transfer = await this.walletTransactionRepo.findOne({
      where: {
        reference: reference.trim(),
        businessId,
        environment,
        source: WalletTransactionSource.PAYOUT,
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transactions not found');
    }

    return { status: transfer.status, code: '00', success: true };
  }

  @Cron('*/3 * * * *')
  async validateOutgoingTransferStatus() {
    try {
      const processingTransfers = await this.walletTransactionRepo.find({
        where: {
          status: WalletTransactionStatus.PROCESSING,
          source: WalletTransactionSource.PAYOUT,
          environment: RequestEnvironment.LIVE,
        },
        order: { createdAt: 'ASC' },
        take: 200,
      });

      if (processingTransfers.length === 0) {
        return;
      }

      const adapter = this.transferAdapterFactory.getTransferdapter(
        TransferProvider.VFD,
      );

      await Promise.allSettled(
        processingTransfers.map(async (transfer) => {
          const result = await adapter.transactionStatusQuery({
            environment: transfer.environment,
            reference: transfer.reference,
          });

          if (!result.success) {
            return;
          }

          await this.walletTransactionRepo.update(
            { walletTransactionId: transfer.walletTransactionId },
            {
              status: WalletTransactionStatus.COMPLETED,
              providerReference: result.sessionId ?? transfer.providerReference,
            },
          );
        }),
      );
    } catch (error) {
      this.logger.error(
        'Failed to validate outgoing transfer status',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
