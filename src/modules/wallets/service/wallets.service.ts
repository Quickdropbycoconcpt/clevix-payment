import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  CreateWalletInterface,
  CreditWallet,
  DebitWallet,
} from '../interface/wallet.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Wallets } from '../entity/wallet.entity';
import { EntityManager, Repository } from 'typeorm';
import { JwtPayload } from 'src/modules/authentication/interface/jwt-payload.interface';
import { businessScopeFilter } from 'src/shared/business-scope';
import {
  CollectionChannel,
  LedgerEntryDirection,
  RequestEnvironment,
  TransactionRiskStatus,
  TransactionSettlementStatus,
  TransactionSource,
  TransactionStatus,
  WalletTransactionSource,
  WalletTransactionStatus,
  WalletTransactionType,
} from 'src/shared/enum';
import { LedgerService } from 'src/modules/ledger/service/ledger.service';
import {
  LedgerAccountOwnerType,
  LedgerAccountType,
} from 'src/modules/ledger/enums/ledger.enums';
import { TransactionService } from 'src/modules/transactions/service/transaction.service';
import { Transactions } from 'src/modules/transactions/entity/transaction.entity';
import { FeeConfigurationService } from 'src/modules/fees-configuration/service/fees_revenue.service';
import { TransactionFeesService } from 'src/modules/transaction_fees/service/transaction_fees.service';
import { WebhookService } from 'src/modules/webhooks/service/webhook.service';
import { WalletTransactions } from '../entity/wallet_transactions.entity';

type CreditWalletAmounts = {
  totalAmount: bigint;
  settledAmount: bigint;
  netAmount: bigint;
  providerFee: bigint;
  merchantFee: bigint;
};

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallets)
    private readonly walletRepo: Repository<Wallets>,
    @InjectRepository(WalletTransactions)
    private readonly walletTransactionRepo: Repository<WalletTransactions>,
    private readonly txnService: TransactionService,
    private readonly ledgerService: LedgerService,
    private readonly txnFee: TransactionFeesService,
    private readonly feeConfigService: FeeConfigurationService,
    private readonly webhookService: WebhookService,
  ) {}

  async creditUserWallet(input: CreditWallet) {
    try {
      const { reference, amount, businessId, provider } = input;
      /**
       * Keyed off the merchant reference (not our own `reference`) because
       * callers like the POS charge flow mint a fresh internal reference on
       * every attempt, so checking `reference` alone would never catch a
       * retry.
       */
      const dedupeReference = input.merchantReference ?? reference;
      const feeSource = this.getFeeSource(
        input.source,
        input.collectionChannel,
      );
      const { providerFee, chargedFee: merchantFee } =
        await this.feeConfigService.getFeeBySource(
          feeSource,
          businessId,
          provider,
          amount,
          input.feeCharged
            ? {
                feature: feeSource,
                feeCollected: input.feeCharged,
              }
            : undefined,
        );
      const totalAmount = BigInt(amount);
      const settledAmount = totalAmount - providerFee;
      const netAmount = totalAmount - merchantFee;

      if (settledAmount < 0n || netAmount < 0n) {
        throw new BadRequestException('Invalid wallet credit amount');
      }

      const result = await this.walletRepo.manager.transaction(
        async (entityManager) =>
          this.processWalletCredit(
            input,
            {
              totalAmount,
              settledAmount,
              netAmount,
              providerFee,
              merchantFee,
            },
            dedupeReference,
            entityManager,
          ),
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to credit wallet for reference=${input?.reference}, businessId=${input?.businessId}, provider=${input?.provider}, source=${input?.source}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private async processWalletCredit(
    input: CreditWallet,
    amounts: CreditWalletAmounts,
    dedupeReference: string,
    entityManager: EntityManager,
  ) {
    const wallet = await this.getLockedCreditWallet(input, entityManager);
    const processed = await this.getProcessedCreditTransaction(
      dedupeReference,
      input.businessId,
      entityManager,
    );

    if (processed) {
      return processed;
    }

    await this.postCreditLedger(input, amounts, entityManager);

    const transaction = await this.saveCreditTransaction(
      input,
      wallet,
      amounts,
      true,
      entityManager,
    );

    await this.creditSpendableWalletBalance(
      wallet.walletId,
      amounts.netAmount,
      entityManager,
    );
    await this.recordCreditTransactionFee(
      input,
      transaction,
      amounts,
      entityManager,
    );

    return transaction;
  }

  private async getLockedCreditWallet(
    input: CreditWallet,
    entityManager: EntityManager,
  ) {
    /**
     * Lock the wallet row before doing anything else. Concurrent credits to
     * the same wallet serialize on this lock instead of racing balance
     * updates or idempotency checks.
     */
    const wallet = await this.findOrCreateWallet(
      { currency: input.currency, businessId: input.businessId },
      {
        environment: input.environment,
        businessId: input.businessId,
        userId: '',
      },
      entityManager,
      { lock: true },
    );

    if (!wallet) {
      throw new BadRequestException('Wallet creation failed');
    }

    return wallet;
  }

  private async getProcessedCreditTransaction(
    dedupeReference: string,
    businessId: string,
    entityManager: EntityManager,
  ) {
    const processed = await this.txnService.getSuccessfulTransaction(
      dedupeReference,
      entityManager,
    );

    if (processed) {
      this.logger.warn(
        `Skipping duplicate wallet credit for merchantReference=${dedupeReference}, businessId=${businessId}`,
      );
    }

    return processed;
  }

  private async postCreditLedger(
    input: CreditWallet,
    amounts: CreditWalletAmounts,
    entityManager: EntityManager,
  ) {
    const businessLedgerAccount =
      await this.ledgerService.findOrCreateLedgerAccount(
        {
          ownerId: input.businessId,
          ownerType: LedgerAccountOwnerType.BUSINESS,
          accountType: LedgerAccountType.CUSTOMER_CASH,
          currency: input.currency,
          environment: input.environment,
        },
        entityManager,
      );
    const providerLedger = await this.ledgerService.findOrCreateLedgerAccount(
      {
        ownerId: input.provider,
        ownerType: LedgerAccountOwnerType.PROVIDER,
        accountType: LedgerAccountType.PROVIDER_SETTLEMENT,
        currency: input.currency,
        environment: input.environment,
      },
      entityManager,
    );
    const revenueLedger = await this.ledgerService.findOrCreateLedgerAccount(
      {
        ownerId: 'clevix-revenue',
        ownerType: LedgerAccountOwnerType.SYSTEM,
        accountType: LedgerAccountType.FEES_REVENUE,
        currency: input.currency,
        environment: input.environment,
      },
      entityManager,
    );
    const providerFeeExpenseLedger =
      await this.ledgerService.findOrCreateLedgerAccount(
        {
          ownerId: `${input.provider}-fee`,
          ownerType: LedgerAccountOwnerType.PROVIDER,
          accountType: LedgerAccountType.PROVIDER_FEE_EXPENSE,
          currency: input.currency,
          environment: input.environment,
        },
        entityManager,
      );

    await this.ledgerService.ledgerPosting(
      {
        reference: input.reference,
        environment: input.environment,
        businessId: input.businessId,
        transactionType: input.source,
        amount: input.amount,
        currency: input.currency,
        entries: [
          {
            ledgerAccountId: providerLedger.ledgerAccountId,
            direction: LedgerEntryDirection.DEBIT,
            amount: amounts.settledAmount.toString(),
            memo: 'Provider settlement receivable',
          },
          {
            ledgerAccountId: providerFeeExpenseLedger.ledgerAccountId,
            direction: LedgerEntryDirection.DEBIT,
            amount: amounts.providerFee.toString(),
            memo: 'Provider collection fee',
          },
          {
            ledgerAccountId: businessLedgerAccount.ledgerAccountId,
            direction: LedgerEntryDirection.CREDIT,
            amount: amounts.netAmount.toString(),
            memo: 'Business wallet credit',
          },
          {
            ledgerAccountId: revenueLedger.ledgerAccountId,
            direction: LedgerEntryDirection.CREDIT,
            amount: amounts.merchantFee.toString(),
            memo: 'Platform collection fee revenue',
          },
        ],
      },
      entityManager,
    );
  }

  private getFeeSource(
    source: TransactionSource,
    collectionChannel?: CollectionChannel | null,
  ) {
    return collectionChannel ?? source;
  }

  private async saveCreditTransaction(
    input: CreditWallet,
    wallet: Wallets,
    amounts: CreditWalletAmounts,
    shouldCreditWalletNow: boolean,
    entityManager: EntityManager,
  ) {
    const existingTransaction =
      await this.txnService.getTransactionBySystemReference(
        input.reference,
        entityManager,
      );
    const metadata = {
      ...existingTransaction?.metadata,
      ...input.metadata,
      grossAmount: amounts.totalAmount.toString(),
      settledAmount: amounts.netAmount.toString(),
      merchantFee: amounts.merchantFee.toString(),
      providerFee: amounts.providerFee.toString(),
    };

    if (existingTransaction) {
      return this.txnService.updateTransactionBySystemReference(
        input.reference,
        {
          settledAmount: amounts.netAmount.toString(),
          fee: amounts.merchantFee.toString(),
          walletId: wallet.walletId,
          collectionChannel: input.collectionChannel ?? null,
          executionStatus: TransactionStatus.SUCCESS,
          settlementStatus: this.getTransactionSettlementStatus(
            shouldCreditWalletNow,
          ),
          riskStatus: TransactionRiskStatus.CLEAR,
          merchantReference:
            input.merchantReference ?? existingTransaction.merchantReference,
          providerReference: input.providerReference ?? input.reference,
          sourceId: input.sourceId ?? existingTransaction.sourceId,
          metadata,
          remark: 'Inward credit completed',
        },
        entityManager,
      );
    }

    return this.txnService.createTransaction(
      {
        businessId: input.businessId,
        environment: input.environment,
        walletId: wallet.walletId,
        expectedAmount: amounts.totalAmount.toString(),
        settledAmount: amounts.netAmount.toString(),
        fee: amounts.merchantFee.toString(),
        source: input.source,
        collectionChannel: input.collectionChannel ?? null,
        reference: input.reference,
        remark: 'Wallet credit completed',
        sourceId: input.sourceId ?? null,
        currency: input.currency,
        provider: input.provider,
        executionStatus: TransactionStatus.SUCCESS,
        merchantReference: input.merchantReference ?? input.reference,
        providerReference: input.providerReference ?? input.reference,
        settlementStatus: this.getTransactionSettlementStatus(
          shouldCreditWalletNow,
        ),
        riskStatus: TransactionRiskStatus.CLEAR,
        direction: LedgerEntryDirection.CREDIT,
        idempotencyKey: `wallet-credit:${input.businessId}:${input.reference}`,
        metadata,
      },
      entityManager,
    );
  }

  private getTransactionSettlementStatus(shouldCreditWalletNow: boolean) {
    return shouldCreditWalletNow
      ? TransactionSettlementStatus.SETTLED
      : TransactionSettlementStatus.UNSETTLED;
  }

  private async creditSpendableWalletBalance(
    walletId: string,
    amount: bigint,
    entityManager: EntityManager,
  ) {
    await entityManager
      .createQueryBuilder()
      .update(Wallets)
      .set({ balance: () => 'balance + :amount' })
      .where('walletId = :walletId', { walletId })
      .setParameter('amount', amount.toString())
      .execute();
  }

  private async recordCreditTransactionFee(
    input: CreditWallet,
    transaction: Transactions,
    amounts: CreditWalletAmounts,
    entityManager: EntityManager,
  ) {
    await this.txnFee.recordTransactionFee(
      {
        transactionId: transaction.transactionId,
        businessId: input.businessId,
        provider: input.provider,
        feeSource: this.getFeeSource(input.source, input.collectionChannel),
        grossAmount: amounts.totalAmount,
        chargedFee: amounts.merchantFee,
        providerFee: amounts.providerFee,
      },
      entityManager,
    );
  }

  async dispatchCreditWebhook(
    input: CreditWallet,
    payload: Record<string, unknown>,
  ) {
    try {
      const transactionId =
        typeof payload.transactionId === 'string'
          ? payload.transactionId
          : null;

      await this.webhookService.dispatchWebhook({
        businessId: input.businessId,
        environment: input.environment,
        transactionId,
        type: input.collectionChannel ?? input.source,
        payload,
      });
    } catch (error) {
      this.logger.error(
        `Failed to dispatch credit webhook for reference=${input.reference}, businessId=${input.businessId}, source=${input.source}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async debitUserWallet(input: DebitWallet) {
    /**
     * Walidate wallet balance
     */
    const { businessId, amount, currency, provider, environment, reference } =
      input;

    const grossPayoutAmount = BigInt(amount);

    if (grossPayoutAmount < 0n) {
      throw new BadRequestException('Amount can not be negative');
    }

    const walletDebitIdempotencyKey = `wallet-debit:${businessId}:${input.reference}`;
    const duplicateTxn = await this.walletTransactionRepo.findOne({
      where: { idempotencyKey: walletDebitIdempotencyKey },
    });

    if (duplicateTxn) {
      throw new BadRequestException('Transaction with reference exist');
    }

    const { providerFee, chargedFee: merchantFee } =
      await this.feeConfigService.getFeeBySource(
        input.source,
        businessId,
        provider,
        amount,
      );

    const totalMerchantDebit = grossPayoutAmount + merchantFee;

    /**
     * Avoid double spend by using database lock.
     */
    return this.walletRepo.manager.transaction(async (entityManager) => {
      const wallet = await this.findOrCreateWallet(
        { currency, businessId },
        { environment, businessId, userId: '' },
        entityManager,
        { lock: true },
      );

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      const walletTransactionRepo =
        entityManager.getRepository(WalletTransactions);
      const existingWalletTransaction = await walletTransactionRepo.findOne({
        where: { idempotencyKey: walletDebitIdempotencyKey },
      });

      if (existingWalletTransaction) {
        throw new BadRequestException('Transaction with reference exist');
      }

      const availableBalanceBefore = BigInt(wallet.balance);
      const availableBalanceAfter = availableBalanceBefore - totalMerchantDebit;

      if (availableBalanceAfter < 0n) {
        throw new BadRequestException('Your balance is currently low');
      }

      const result = await entityManager
        .createQueryBuilder()
        .update(Wallets)
        .set({
          balance: () => 'balance - :amount',
        })
        .where('walletId = :walletId', { walletId: wallet.walletId })
        .andWhere('balance >= :amount', { amount: totalMerchantDebit })
        .setParameter('amount', totalMerchantDebit)
        .execute();

      if (result.affected !== 1) {
        /**
         * Exit here if business doesn't have balance for requested operation
         */
        throw new BadRequestException('Your balance is currently low');
      }

      /**
       * Begin ledger balance recording process
       */
      const businessLedgerAccount =
        await this.ledgerService.findOrCreateLedgerAccount(
          {
            ownerId: businessId,
            ownerType: LedgerAccountOwnerType.BUSINESS,
            accountType: LedgerAccountType.CUSTOMER_CASH,
            currency,
            environment,
          },
          entityManager,
        );

      const providerLedger = await this.ledgerService.findOrCreateLedgerAccount(
        {
          ownerId: provider,
          ownerType: LedgerAccountOwnerType.PROVIDER,
          accountType: LedgerAccountType.PROVIDER_SETTLEMENT,
          currency,
          environment,
        },
        entityManager,
      );

      const revenueLedger = await this.ledgerService.findOrCreateLedgerAccount(
        {
          ownerId: 'clevix-revenue',
          ownerType: LedgerAccountOwnerType.SYSTEM,
          accountType: LedgerAccountType.FEES_REVENUE,
          currency,
          environment,
        },
        entityManager,
      );
      const providerFeeExpenseLedger =
        await this.ledgerService.findOrCreateLedgerAccount(
          {
            ownerId: `${provider}-fee`,
            ownerType: LedgerAccountOwnerType.PROVIDER,
            accountType: LedgerAccountType.PROVIDER_FEE_EXPENSE,
            currency,
            environment,
          },
          entityManager,
        );
      await this.ledgerService.ledgerPosting(
        {
          reference,
          environment,
          businessId: input.businessId,
          transactionType: input.source,
          amount: (totalMerchantDebit + providerFee).toString(),
          currency: input.currency,
          entries: [
            {
              ledgerAccountId: businessLedgerAccount.ledgerAccountId,
              direction: LedgerEntryDirection.DEBIT,
              amount: totalMerchantDebit.toString(),
              memo: 'Total payout from merchant wallet',
            },
            {
              ledgerAccountId: providerFeeExpenseLedger.ledgerAccountId,
              direction: LedgerEntryDirection.DEBIT,
              amount: providerFee.toString(),
              memo: 'Provider payout fee',
            },
            {
              ledgerAccountId: providerLedger.ledgerAccountId,
              direction: LedgerEntryDirection.CREDIT,
              amount: (grossPayoutAmount + providerFee).toString(),
              memo: 'Provider settlement payable',
            },
            {
              ledgerAccountId: revenueLedger.ledgerAccountId,
              direction: LedgerEntryDirection.CREDIT,
              amount: merchantFee.toString(),
              memo: 'Platform payout fee revenue',
            },
          ],
        },
        entityManager,
      );
      return walletTransactionRepo.save(
        walletTransactionRepo.create({
          businessId,
          environment,
          walletId: wallet.walletId,
          reference: input.reference,
          providerReference: input.providerReference ?? input.reference,
          provider: input.provider,
          transactionType: WalletTransactionType.DEBIT,
          amount: totalMerchantDebit.toString(),
          principalAmount: grossPayoutAmount.toString(),
          merchantFee: merchantFee.toString(),
          providerFee: providerFee.toString(),
          availableBalanceBefore: availableBalanceBefore.toString(),
          availableBalanceAfter: availableBalanceAfter.toString(),
          currency,
          narration: input.narration ?? 'Naira payout',
          message: null,
          status: WalletTransactionStatus.PENDING,
          source: WalletTransactionSource.PAYOUT,
          sourceId: input.sourceId ?? null,
          idempotencyKey: walletDebitIdempotencyKey,
          metadata: {
            merchantReference: input.merchantReference,
            reference: input.reference,
          },
        }),
      );
    });
  }

  async failAndReversePayout(
    walletTransactionId: string,
    expectedStatus: WalletTransactionStatus,
    failure: Pick<
      WalletTransactions,
      'message' | 'providerReference' | 'statusCheckAttempts'
    >,
  ): Promise<WalletTransactions | null> {
    return this.walletRepo.manager.transaction(async (entityManager) => {
      const walletTransactionRepo =
        entityManager.getRepository(WalletTransactions);
      const debit = await walletTransactionRepo.findOne({
        where: {
          walletTransactionId,
          source: WalletTransactionSource.PAYOUT,
          transactionType: WalletTransactionType.DEBIT,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (debit?.status !== expectedStatus) {
        return null;
      }

      const wallet = await entityManager.getRepository(Wallets).findOne({
        where: { walletId: debit.walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      if (
        debit.principalAmount === null ||
        debit.merchantFee === null ||
        debit.providerFee === null
      ) {
        throw new BadRequestException(
          `Payout debit ${debit.reference} has no amount breakdown; refund needs manual review`,
        );
      }

      const refundAmount = BigInt(debit.amount);
      const payoutAmount = BigInt(debit.principalAmount);
      const merchantFee = BigInt(debit.merchantFee);
      const providerFee = BigInt(debit.providerFee);

      if (refundAmount <= 0n || payoutAmount + merchantFee !== refundAmount) {
        throw new BadRequestException(
          `Payout debit ${debit.reference} has inconsistent amounts; refund needs manual review`,
        );
      }

      const reversed = await walletTransactionRepo.update(
        {
          walletTransactionId: debit.walletTransactionId,
          status: expectedStatus,
        },
        {
          status: WalletTransactionStatus.REVERSED,
          message: failure.message,
          providerReference: failure.providerReference,
          statusCheckAttempts: failure.statusCheckAttempts,
          nextStatusCheckAt: null,
        },
      );

      if (reversed.affected !== 1) {
        return null;
      }

      await this.postPayoutReversalLedger(
        debit,
        { refundAmount, payoutAmount, merchantFee, providerFee },
        entityManager,
      );

      const availableBalanceBefore = BigInt(wallet.balance);

      await this.creditSpendableWalletBalance(
        wallet.walletId,
        refundAmount,
        entityManager,
      );

      return walletTransactionRepo.save(
        walletTransactionRepo.create({
          businessId: debit.businessId,
          environment: debit.environment,
          walletId: wallet.walletId,
          reference: `${debit.reference}-REFUND`,
          providerReference: debit.providerReference,
          provider: debit.provider,
          transactionType: WalletTransactionType.CREDIT,
          amount: refundAmount.toString(),
          principalAmount: debit.principalAmount,
          merchantFee: debit.merchantFee,
          providerFee: debit.providerFee,
          availableBalanceBefore: availableBalanceBefore.toString(),
          availableBalanceAfter: (
            availableBalanceBefore + refundAmount
          ).toString(),
          currency: debit.currency,
          narration: `Refund for failed payout ${debit.reference}`,
          message: failure.message,
          status: WalletTransactionStatus.COMPLETED,
          source: WalletTransactionSource.REVERSAL,
          sourceId: debit.walletTransactionId,
          idempotencyKey: `wallet-refund:${debit.businessId}:${debit.reference}`,
          metadata: {
            ...debit.metadata,
            reversedWalletTransactionId: debit.walletTransactionId,
          },
        }),
      );
    });
  }

  private async postPayoutReversalLedger(
    debit: WalletTransactions,
    amounts: {
      refundAmount: bigint;
      payoutAmount: bigint;
      merchantFee: bigint;
      providerFee: bigint;
    },
    entityManager: EntityManager,
  ) {
    const { businessId, currency, environment } = debit;
    const provider = debit.provider ?? '';
    const businessLedgerAccount =
      await this.ledgerService.findOrCreateLedgerAccount(
        {
          ownerId: businessId,
          ownerType: LedgerAccountOwnerType.BUSINESS,
          accountType: LedgerAccountType.CUSTOMER_CASH,
          currency,
          environment,
        },
        entityManager,
      );
    const providerLedger = await this.ledgerService.findOrCreateLedgerAccount(
      {
        ownerId: provider,
        ownerType: LedgerAccountOwnerType.PROVIDER,
        accountType: LedgerAccountType.PROVIDER_SETTLEMENT,
        currency,
        environment,
      },
      entityManager,
    );
    const revenueLedger = await this.ledgerService.findOrCreateLedgerAccount(
      {
        ownerId: 'clevix-revenue',
        ownerType: LedgerAccountOwnerType.SYSTEM,
        accountType: LedgerAccountType.FEES_REVENUE,
        currency,
        environment,
      },
      entityManager,
    );
    const providerFeeExpenseLedger =
      await this.ledgerService.findOrCreateLedgerAccount(
        {
          ownerId: `${provider}-fee`,
          ownerType: LedgerAccountOwnerType.PROVIDER,
          accountType: LedgerAccountType.PROVIDER_FEE_EXPENSE,
          currency,
          environment,
        },
        entityManager,
      );

    await this.ledgerService.ledgerPosting(
      {
        reference: `${debit.reference}-REFUND`,
        environment,
        businessId,
        transactionType: WalletTransactionSource.REVERSAL,
        amount: (amounts.refundAmount + amounts.providerFee).toString(),
        currency,
        entries: [
          {
            ledgerAccountId: providerLedger.ledgerAccountId,
            direction: LedgerEntryDirection.DEBIT,
            amount: (amounts.payoutAmount + amounts.providerFee).toString(),
            memo: 'Reversal of provider settlement payable',
          },
          {
            ledgerAccountId: revenueLedger.ledgerAccountId,
            direction: LedgerEntryDirection.DEBIT,
            amount: amounts.merchantFee.toString(),
            memo: 'Reversal of platform payout fee revenue',
          },
          {
            ledgerAccountId: businessLedgerAccount.ledgerAccountId,
            direction: LedgerEntryDirection.CREDIT,
            amount: amounts.refundAmount.toString(),
            memo: 'Refund of failed payout to merchant wallet',
          },
          {
            ledgerAccountId: providerFeeExpenseLedger.ledgerAccountId,
            direction: LedgerEntryDirection.CREDIT,
            amount: amounts.providerFee.toString(),
            memo: 'Reversal of provider payout fee',
          },
        ],
      },
      entityManager,
    );
  }

  async findOrCreateWallet(
    input: CreateWalletInterface,
    jwtResult: JwtPayload,
    entityManager?: EntityManager,
    options: { lock?: boolean } = {},
  ) {
    const walletRepo = entityManager?.getRepository(Wallets) ?? this.walletRepo;
    const scope = businessScopeFilter(jwtResult);
    const { pagination, ...rest } = scope;
    const wallet = await walletRepo.findOne({
      where: {
        currency: input.currency,
        ...rest,
      },
      ...(options.lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });

    if (wallet) {
      return wallet;
    }

    const entity = walletRepo.create({
      currency: input.currency,
      ...scope,
    });

    return walletRepo.save(entity);
  }

  async setupNewBusinessWallet(
    input: CreateWalletInterface,
    entityManager?: EntityManager,
  ) {
    const walletRepo = entityManager?.getRepository(Wallets) ?? this.walletRepo;

    const wallet = await walletRepo.findOne({
      where: {
        currency: input.currency,
        businessId: input.businessId,
        environment: RequestEnvironment.TEST,
      },
    });

    if (wallet) {
      return wallet;
    }

    const entity = walletRepo.create({
      currency: input.currency,
      businessId: input.businessId,
      environment: RequestEnvironment.TEST,
    });

    return walletRepo.save(entity);
  }
}
