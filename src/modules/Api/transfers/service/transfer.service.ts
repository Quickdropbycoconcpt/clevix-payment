import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransferStatusResult } from '../types/transfer-provider';
import { WalletService } from 'src/modules/wallets/service/wallets.service';
import { WithdrawalDto } from '../dto/transfer.dto';
import { getBusinessScope, RequestScope } from 'src/shared/business-scope';
import {
  ProviderServiceType,
  RequestEnvironment,
  TransactionSource,
  WalletTransactionSource,
  WalletTransactionStatus,
} from 'src/shared/enum';
import { AddTransferIntoQue } from '../job/transfer-queue-job';
import { TransferAdapterFactory } from '../adapters/transfer.adapter.factory';
import { WalletTransactions } from 'src/modules/wallets/entity/wallet_transactions.entity';
import { ProviderService } from 'src/modules/Api/providers/service/providers.service';

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly transferQueue: AddTransferIntoQue,
    private readonly transferAdapterFactory: TransferAdapterFactory,
    private readonly providerService: ProviderService,
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
    const { value: provider } =
      await this.providerService.getActiveProviderForService(
        ProviderServiceType.TRANSFER,
      );
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

    return {
      status: transfer.status,
      code: transfer.status === WalletTransactionStatus.COMPLETED ? '00' : '01',
      success: transfer.status === WalletTransactionStatus.COMPLETED,
      sessionId: transfer.providerReference,
    };
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

      await Promise.allSettled(
        processingTransfers.map(async (transfer) => {
          const adapter = this.transferAdapterFactory.getTransferdapter(
            transfer.provider,
          );
          const result = await adapter.transactionStatusQuery({
            environment: transfer.environment,
            reference: transfer.reference,
          });
          console.log(result);
          if (result.status === TransferStatusResult.PENDING) {
            return;
          }

          await this.walletTransactionRepo.update(
            { walletTransactionId: transfer.walletTransactionId },
            {
              status:
                result.status === TransferStatusResult.SUCCESS
                  ? WalletTransactionStatus.COMPLETED
                  : WalletTransactionStatus.FAILED,
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
