import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { TransferStatusResult } from '../types/transfer-provider';
import {
  nextStatusCheckAt,
  NOT_FOUND_FAIL_AFTER_MS,
  PENDING_CHECK_LOCK_KEY,
  PENDING_CHECK_LOCK_TTL_MS,
  PROCESSING_CHECK_LOCK_KEY,
  PROCESSING_CHECK_LOCK_TTL_MS,
  STATUS_CHECK_BATCH_SIZE,
  STUCK_PENDING_AFTER_MS,
} from '../types/transfer-status-check';
import { RedisConfig } from 'src/infrastructure/redis/redis.config';
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
import { BanksService } from 'src/modules/Api/banks/service/banks.service';

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);
  private readonly redis = new RedisConfig();

  constructor(
    private readonly walletService: WalletService,
    private readonly transferQueue: AddTransferIntoQue,
    private readonly transferAdapterFactory: TransferAdapterFactory,
    private readonly providerService: ProviderService,
    private readonly banksService: BanksService,
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
    const providerBankCode = await this.banksService.resolveProviderBankCode(
      bankCode,
      provider,
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
      bankCode: providerBankCode,
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

  @Cron('*/5 * * * * *')
  async validateOutgoingTransferStatus() {
    try {
      await this.redis.withLock(
        PROCESSING_CHECK_LOCK_KEY,
        PROCESSING_CHECK_LOCK_TTL_MS,
        () => this.checkProcessingTransfers(),
      );
    } catch (error) {
      this.logger.error(
        'Failed to validate outgoing transfer status',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkStuckPendingTransfers() {
    try {
      await this.redis.withLock(
        PENDING_CHECK_LOCK_KEY,
        PENDING_CHECK_LOCK_TTL_MS,
        () => this.checkPendingTransfers(),
      );
    } catch (error) {
      this.logger.error(
        'Failed to check stuck pending transfers',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async checkProcessingTransfers() {
    const processingTransfers = await this.walletTransactionRepo.find({
      where: [
        {
          status: WalletTransactionStatus.PROCESSING,
          source: WalletTransactionSource.PAYOUT,
          environment: RequestEnvironment.LIVE,
          nextStatusCheckAt: LessThanOrEqual(new Date()),
        },
        {
          status: WalletTransactionStatus.PROCESSING,
          source: WalletTransactionSource.PAYOUT,
          environment: RequestEnvironment.LIVE,
          nextStatusCheckAt: IsNull(),
        },
      ],
      order: { nextStatusCheckAt: { direction: 'ASC', nulls: 'FIRST' } },
      take: STATUS_CHECK_BATCH_SIZE,
    });

    await Promise.allSettled(
      processingTransfers.map((transfer) =>
        this.settleProcessingTransfer(transfer),
      ),
    );
  }

  private async checkPendingTransfers() {
    const now = new Date();
    const stuckBefore = new Date(now.getTime() - STUCK_PENDING_AFTER_MS);
    const pendingTransfers = await this.walletTransactionRepo.find({
      where: [
        {
          status: WalletTransactionStatus.PENDING,
          source: WalletTransactionSource.PAYOUT,
          environment: RequestEnvironment.LIVE,
          createdAt: LessThanOrEqual(stuckBefore),
          nextStatusCheckAt: LessThanOrEqual(now),
        },
        {
          status: WalletTransactionStatus.PENDING,
          source: WalletTransactionSource.PAYOUT,
          environment: RequestEnvironment.LIVE,
          createdAt: LessThanOrEqual(stuckBefore),
          nextStatusCheckAt: IsNull(),
        },
      ],
      order: { createdAt: 'ASC' },
      take: STATUS_CHECK_BATCH_SIZE,
    });

    for (const transfer of pendingTransfers) {
      await this.checkStuckPendingTransfer(transfer);
    }
  }

  private async settleProcessingTransfer(transfer: WalletTransactions) {
    const result = await this.queryTransferStatus(transfer);

    if (
      result.status === TransferStatusResult.SUCCESS ||
      result.status === TransferStatusResult.FAILED
    ) {
      const settled = await this.walletTransactionRepo.update(
        {
          walletTransactionId: transfer.walletTransactionId,
          status: WalletTransactionStatus.PROCESSING,
        },
        {
          status:
            result.status === TransferStatusResult.SUCCESS
              ? WalletTransactionStatus.COMPLETED
              : WalletTransactionStatus.FAILED,
          providerReference: result.sessionId ?? transfer.providerReference,
          nextStatusCheckAt: null,
          statusCheckAttempts: transfer.statusCheckAttempts + 1,
          ...(result.status === TransferStatusResult.FAILED
            ? {
                message:
                  `Provider status ${result.providerStatus ?? ''}`.trim(),
              }
            : {}),
        },
      );

      if (settled.affected === 1) {
        this.logger.log(
          `Settled transfer reference=${transfer.reference} status=${result.status} providerStatus=${result.providerStatus}`,
        );
      }
      return;
    }

    if (result.status === TransferStatusResult.NOT_FOUND) {
      const now = new Date();

      if (this.notFoundLongEnough(transfer)) {
        const failed = await this.walletTransactionRepo.update(
          {
            walletTransactionId: transfer.walletTransactionId,
            status: WalletTransactionStatus.PROCESSING,
          },
          {
            status: WalletTransactionStatus.FAILED,
            message: 'Transfer not found at provider',
            nextStatusCheckAt: null,
            statusCheckAttempts: transfer.statusCheckAttempts + 1,
          },
        );

        if (failed.affected === 1) {
          this.logger.warn(
            `Failed transfer reference=${transfer.reference}: provider has no record since ${new Date(transfer.firstNotFoundAt).toISOString()}`,
          );
        }
        return;
      }

      await this.scheduleNextStatusCheck(
        transfer,
        WalletTransactionStatus.PROCESSING,
        { firstNotFoundAt: transfer.firstNotFoundAt ?? now },
      );
      return;
    }

    await this.scheduleNextStatusCheck(
      transfer,
      WalletTransactionStatus.PROCESSING,
      result.providerStatus ? { firstNotFoundAt: null } : {},
    );
  }

  private async checkStuckPendingTransfer(transfer: WalletTransactions) {
    if (await this.transferQueue.isQueued(transfer.reference)) {
      return;
    }

    const result = await this.queryTransferStatus(transfer);

    if (result.status === TransferStatusResult.NOT_FOUND) {
      if (this.notFoundLongEnough(transfer)) {
        const failed = await this.walletTransactionRepo.update(
          {
            walletTransactionId: transfer.walletTransactionId,
            status: WalletTransactionStatus.PENDING,
          },
          {
            status: WalletTransactionStatus.FAILED,
            message: 'Transfer not found at provider',
            nextStatusCheckAt: null,
            statusCheckAttempts: transfer.statusCheckAttempts + 1,
          },
        );

        if (failed.affected === 1) {
          this.logger.warn(
            `Failed stuck pending transfer reference=${transfer.reference}: provider has no record since ${new Date(transfer.firstNotFoundAt).toISOString()}`,
          );
        }
        return;
      }

      await this.scheduleNextStatusCheck(
        transfer,
        WalletTransactionStatus.PENDING,
        { firstNotFoundAt: transfer.firstNotFoundAt ?? new Date() },
      );
      return;
    }

    if (
      result.status === TransferStatusResult.PENDING &&
      !result.providerStatus
    ) {
      await this.scheduleNextStatusCheck(
        transfer,
        WalletTransactionStatus.PENDING,
      );
      return;
    }

    const moved = await this.walletTransactionRepo.update(
      {
        walletTransactionId: transfer.walletTransactionId,
        status: WalletTransactionStatus.PENDING,
      },
      {
        status: WalletTransactionStatus.PROCESSING,
        statusCheckAttempts: 0,
        firstNotFoundAt: null,
        nextStatusCheckAt: new Date(),
      },
    );

    if (moved.affected === 1) {
      this.logger.warn(
        `Stuck pending transfer reference=${transfer.reference} found at provider; moved to PROCESSING`,
      );
    }
  }

  private notFoundLongEnough(transfer: WalletTransactions): boolean {
    return (
      !!transfer.firstNotFoundAt &&
      Date.now() - new Date(transfer.firstNotFoundAt).getTime() >=
        NOT_FOUND_FAIL_AFTER_MS
    );
  }

  private async queryTransferStatus(transfer: WalletTransactions) {
    const adapter = this.transferAdapterFactory.getTransferdapter(
      transfer.provider,
    );

    return adapter.transactionStatusQuery({
      environment: transfer.environment,
      reference: transfer.reference,
    });
  }

  private async scheduleNextStatusCheck(
    transfer: WalletTransactions,
    status: WalletTransactionStatus,
    extra: Partial<Pick<WalletTransactions, 'firstNotFoundAt'>> = {},
  ) {
    await this.walletTransactionRepo.update(
      { walletTransactionId: transfer.walletTransactionId, status },
      {
        ...extra,
        statusCheckAttempts: transfer.statusCheckAttempts + 1,
        nextStatusCheckAt: nextStatusCheckAt(transfer.statusCheckAttempts + 1),
      },
    );
  }
}
