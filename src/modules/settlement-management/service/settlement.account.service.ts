import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SettlementInput } from '../interface/settlement.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { SettlementBankAccounts } from '../entity/settlement_accounts.entity';
import { getBusinessScope, RequestScope } from 'src/shared/business-scope';
import { Banks } from 'src/modules/Api/banks/entity/banks.entity';
import type { CreditWallet } from 'src/modules/wallets/interface/wallet.interface';
import { Wallets } from 'src/modules/wallets/entity/wallet.entity';
import type { Transactions } from 'src/modules/transactions/entity/transaction.entity';
import {
  CollectionChannel,
  IncomingPaymentSource,
  LedgerEntryDirection,
  TransactionRiskStatus,
  TransactionSettlementStatus,
  TransactionSource,
  TransactionStatus,
  WalletTransactionSource,
  WalletTransactionStatus,
  WalletTransactionType,
} from 'src/shared/enum';
import {
  BusinessSettlementConfig,
  BusinessSettlementType,
  SettlementLocation,
} from '../entity/business_settlement_config.entity';
import {
  allocateSettlementShares,
  SettlementShare,
  SettlementSharingAllocation,
} from 'src/shared/utils';
import { COLLECTION_CHANNEL_TO_PAYMENT_SOURCE } from 'src/shared/constants/settlement.constants';
import { BusinessSettlementConfigurationService } from './settlement_business_config.service';
import { SettlementAccountResolutionService } from './settlement-account-resolution.service';
import { SettlementTransactionsService } from './settlement-transactions.service';
import {
  SettlementTransactions,
  SettlementTransactionStatus,
} from '../entity/settlement_transactions.entity';
import { FeeConfigurationService } from 'src/modules/fees-configuration/service/fees_revenue.service';
import { TransactionService } from 'src/modules/transactions/service/transaction.service';
import { TransactionFeesService } from 'src/modules/transaction_fees/service/transaction_fees.service';
import { LedgerService } from 'src/modules/ledger/service/ledger.service';
import {
  LedgerAccountOwnerType,
  LedgerAccountType,
} from 'src/modules/ledger/enums/ledger.enums';
import { WalletTransactions } from 'src/modules/wallets/entity/wallet_transactions.entity';

type CreditWalletAmounts = {
  totalAmount: bigint;
  settledAmount: bigint;
  netAmount: bigint;
  providerFee: bigint;
  merchantFee: bigint;
};

type CreditSettlementContext = {
  paymentSource: IncomingPaymentSource | undefined;
  settlementConfig: BusinessSettlementConfig | null;
  allocations: SettlementSharingAllocation[] | undefined;
  shouldCreditWalletNow: boolean;
};

type CreditSettlementOptions = {
  settlementType: BusinessSettlementType;
  bucketStatus: SettlementTransactionStatus;
  settledAt: Date | null;
};

type RecordSettlementInput = {
  input: CreditWallet;
  wallet: Wallets;
  transaction: Transactions;
  amounts: CreditWalletAmounts;
  context: CreditSettlementContext;
};

type SettlementDestination = {
  settlementBankAccountId: string | null;
  walletId: string | null;
};

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    @InjectRepository(SettlementBankAccounts)
    private readonly settlementAccountRepo: Repository<SettlementBankAccounts>,
    @InjectRepository(Banks)
    private readonly banksRepo: Repository<Banks>,
    private readonly settlementConfigService: BusinessSettlementConfigurationService,
    private readonly settlementAccountResolutionService: SettlementAccountResolutionService,
    private readonly settlementTransactionsService: SettlementTransactionsService,
    private readonly feeConfigService: FeeConfigurationService,
    private readonly txnService: TransactionService,
    private readonly txnFee: TransactionFeesService,
    private readonly ledgerService: LedgerService,
  ) {}

  async addSettlementBankAccount(input: SettlementInput, scope: RequestScope) {
    const { businessId, environment } = getBusinessScope(scope);

    try {
      const bank = await this.banksRepo.findOne({
        where: { bankId: input.providerbankId?.trim() },
      });

      if (!bank) {
        throw new NotFoundException('Bank not found');
      }

      const existing = await this.settlementAccountRepo.findOne({
        where: {
          accountNumber: input.accountNumber.trim(),
          businessId,
          environment,
        },
        withDeleted: true,
      });
      if (existing) {
        if (existing.deletedAt) {
          await this.settlementAccountRepo.restore({
            bankAccountId: existing.bankAccountId,
          });
          existing.deletedAt = null;
        }
        return existing;
      }
      const acct = this.settlementAccountRepo.create({
        accountName: input.accountName?.trim(),
        accountNumber: input.accountNumber?.trim(),
        providerbankId: bank.bankId,
        businessId,
        environment,
      });
      const saved = await this.settlementAccountRepo.save(acct);
      return saved;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async removeSettlementAccount(settlementAccountId: string) {
    const existing = await this.settlementAccountRepo.findOne({
      where: { bankAccountId: settlementAccountId },
    });

    if (!existing) {
      throw new NotFoundException('Settlement account not found');
    }

    await this.settlementAccountRepo.softDelete({
      bankAccountId: settlementAccountId,
    });

    return { removed: true };
  }

  async getPrimaryAccount(businessId: string, environment: string) {
    return this.settlementAccountRepo.findOne({
      where: { businessId, environment, isPrimary: true },
    });
  }

  async createSettlement(input: CreditWallet) {
    try {
      const amounts = await this.getCreditAmounts(input);
      const dedupeReference = input.merchantReference ?? input.reference;

      return await this.settlementAccountRepo.manager.transaction(
        async (entityManager) =>
          this.processCollectionSettlement(
            input,
            amounts,
            dedupeReference,
            entityManager,
          ),
      );
    } catch (error) {
      this.logger.error(
        `Failed to create settlement for reference=${input?.reference}, businessId=${input?.businessId}, provider=${input?.provider}, source=${input?.source}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private async getCreditAmounts(input: CreditWallet) {
    const feeSource = this.getFeeSource(input.source, input.collectionChannel);
    const { providerFee, chargedFee: merchantFee } =
      await this.feeConfigService.getFeeBySource(
        feeSource,
        input.businessId,
        input.provider,
        input.amount,
        input.feeCharged
          ? {
              feature: feeSource,
              feeCollected: input.feeCharged,
            }
          : undefined,
      );
    const totalAmount = BigInt(input.amount);
    const settledAmount = totalAmount - providerFee;
    const netAmount = totalAmount - merchantFee;

    if (settledAmount < 0n || netAmount < 0n) {
      throw new BadRequestException('Invalid wallet credit amount');
    }

    return {
      totalAmount,
      settledAmount,
      netAmount,
      providerFee,
      merchantFee,
    };
  }

  private async processCollectionSettlement(
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

    const settlementContext = await this.resolveCreditSettlementContext(
      input,
      dedupeReference,
    );
    const transaction = await this.saveCreditTransaction(
      input,
      wallet,
      amounts,
      settlementContext.shouldCreditWalletNow,
      entityManager,
    );

    const settlementTransactions = await this.recordSettlement(
      {
        input,
        wallet,
        transaction,
        amounts,
        context: settlementContext,
      },
      entityManager,
    );

    if (settlementContext.shouldCreditWalletNow) {
      await this.postCreditLedger(input, amounts, entityManager);
      await this.creditSpendableWalletBalance(
        input,
        wallet,
        amounts.netAmount,
        transaction,
        settlementTransactions[0]?.settlementTransactionsId ??
          transaction.transactionId,
        entityManager,
      );
    } else {
      await this.postDeferredSettlementLedger(
        input,
        amounts,
        transaction,
        entityManager,
      );
    }

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
    const walletRepo = entityManager.getRepository(Wallets);
    const wallet = await walletRepo.findOne({
      where: {
        currency: input.currency,
        businessId: input.businessId,
        environment: input.environment,
      },
      lock: { mode: 'pessimistic_write' },
    });

    if (wallet) {
      return wallet;
    }

    return walletRepo.save(
      walletRepo.create({
        currency: input.currency,
        businessId: input.businessId,
        environment: input.environment,
      }),
    );
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
        `Skipping duplicate settlement for merchantReference=${dedupeReference}, businessId=${businessId}`,
      );
    }

    return processed;
  }

  private async resolveCreditSettlementContext(
    input: CreditWallet,
    dedupeReference: string,
  ): Promise<CreditSettlementContext> {
    const paymentSource = input.collectionChannel
      ? COLLECTION_CHANNEL_TO_PAYMENT_SOURCE[input.collectionChannel]
      : undefined;
    const settlementConfig = paymentSource
      ? await this.settlementConfigService.getConfig(
          { businessId: input.businessId, environment: input.environment },
          paymentSource,
        )
      : null;
    const allocations =
      await this.settlementAccountResolutionService.resolve(dedupeReference);
    const shouldCreditWalletNow = this.shouldCreditWalletNow(
      settlementConfig,
      allocations,
    );

    return {
      paymentSource,
      settlementConfig,
      allocations,
      shouldCreditWalletNow,
    };
  }

  private async recordSettlement(
    { input, wallet, transaction, amounts, context }: RecordSettlementInput,
    entityManager: EntityManager,
  ) {
    this.assertSettlementSourceIsMapped(
      context.paymentSource,
      context.shouldCreditWalletNow,
      input.source,
    );

    if (!context.paymentSource) {
      return [];
    }

    const options = this.getCreditSettlementOptions(context);
    const shares = allocateSettlementShares(
      this.getEffectiveSettlementAllocations(input, amounts, context),
      Boolean(input.feeCharged),
      amounts.merchantFee,
    );

    const settlementTransactions: SettlementTransactions[] = [];

    for (const share of shares) {
      const settlementTransaction = await this.recordSettlementShare(
        input,
        wallet,
        transaction,
        share,
        {
          ...context,
          paymentSource: context.paymentSource,
        },
        options,
        entityManager,
      );

      if (settlementTransaction) {
        settlementTransactions.push(settlementTransaction);
      }
    }

    return settlementTransactions;
  }

  private shouldCreditWalletNow(
    settlementConfig: BusinessSettlementConfig | null,
    allocations?: SettlementSharingAllocation[],
  ) {
    const hasAccountOverride = (allocations ?? []).some(
      (allocation) =>
        allocation.settlementBankAccountId !== null ||
        Boolean(allocation.walletId),
    );

    return (
      !hasAccountOverride &&
      (!settlementConfig ||
        settlementConfig.settlementType === BusinessSettlementType.INSTANT)
    );
  }

  private assertSettlementSourceIsMapped(
    paymentSource: IncomingPaymentSource | undefined,
    shouldCreditWalletNow: boolean,
    source: TransactionSource,
  ) {
    if (!paymentSource && !shouldCreditWalletNow) {
      throw new BadRequestException(
        `Cannot defer settlement for unmapped transaction source: ${source}`,
      );
    }
  }

  private getCreditSettlementOptions(
    context: CreditSettlementContext,
  ): CreditSettlementOptions {
    const settlementType =
      context.settlementConfig?.settlementType ??
      (context.shouldCreditWalletNow
        ? BusinessSettlementType.INSTANT
        : BusinessSettlementType.T_PLUS_1);

    return {
      settlementType,
      bucketStatus: context.shouldCreditWalletNow
        ? SettlementTransactionStatus.SETTLED
        : SettlementTransactionStatus.UNSETTLED,
      settledAt: context.shouldCreditWalletNow ? new Date() : null,
    };
  }

  private getEffectiveSettlementAllocations(
    input: CreditWallet,
    amounts: CreditWalletAmounts,
    context: CreditSettlementContext,
  ): SettlementSharingAllocation[] {
    if (context.allocations?.length) {
      return context.allocations;
    }

    return [
      {
        settlementBankAccountId: null,
        grossAmount: (input.feeCharged
          ? amounts.netAmount
          : amounts.totalAmount
        ).toString(),
      },
    ];
  }

  private async recordSettlementShare(
    input: CreditWallet,
    wallet: Wallets,
    transaction: Transactions,
    share: SettlementShare,
    context: CreditSettlementContext & { paymentSource: IncomingPaymentSource },
    options: CreditSettlementOptions,
    entityManager: EntityManager,
  ): Promise<SettlementTransactions | null> {
    if (share.amount <= 0n) {
      return null;
    }

    const destination = await this.resolveSettlementDestination(
      input,
      wallet,
      share,
      context,
    );
    const settlementTransaction =
      await this.settlementTransactionsService.upsertSettlementBucket(
        {
          businessId: input.businessId,
          environment: input.environment,
          paymentSource: context.paymentSource,
          settlementType: options.settlementType,
          settlementBankAccountId: destination.settlementBankAccountId,
          walletId: destination.walletId,
          amount: share.amount,
          status: options.bucketStatus,
          settledAt: options.settledAt,
        },
        entityManager,
      );

    await this.settlementTransactionsService.recordSettlementTransactionItem(
      {
        businessId: input.businessId,
        environment: input.environment,
        settlementTransactionsId:
          settlementTransaction.settlementTransactionsId,
        transactionId: transaction.transactionId,
        amount: share.amount,
        metadata: {
          ...share.metadata,
          paymentSource: context.paymentSource,
          collectionChannel: input.collectionChannel,
          settlementType: options.settlementType,
          settlementBankAccountId: destination.settlementBankAccountId,
          walletId: destination.walletId,
        },
      },
      entityManager,
    );

    return settlementTransaction;
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
        remark: 'Collection settlement created',
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
        idempotencyKey: `collection-settlement:${input.businessId}:${input.reference}`,
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

  private async postDeferredSettlementLedger(
    input: CreditWallet,
    amounts: CreditWalletAmounts,
    transaction: Transactions,
    entityManager: EntityManager,
  ) {
    const settlementPayableLedger =
      await this.ledgerService.findOrCreateLedgerAccount(
        {
          ownerId: input.businessId,
          ownerType: LedgerAccountOwnerType.BUSINESS,
          accountType: LedgerAccountType.SETTLEMENT_PAYABLE,
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
        reference: `settlement-collection:${transaction.transactionId}`,
        environment: input.environment,
        businessId: input.businessId,
        transactionType: input.source,
        description: 'Deferred collection settlement payable',
        amount: input.amount,
        currency: input.currency,
        metadata: {
          transactionId: transaction.transactionId,
          reference: input.reference,
          merchantReference: input.merchantReference,
          collectionChannel: input.collectionChannel,
        },
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
            ledgerAccountId: settlementPayableLedger.ledgerAccountId,
            direction: LedgerEntryDirection.CREDIT,
            amount: amounts.netAmount.toString(),
            memo: 'Business settlement payable',
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

  private async creditSpendableWalletBalance(
    input: CreditWallet,
    wallet: Wallets,
    amount: bigint,
    transaction: Transactions,
    sourceId: string,
    entityManager: EntityManager,
  ) {
    const walletTransactionRepo =
      entityManager.getRepository(WalletTransactions);
    const idempotencyKey = `settlement-wallet-credit:${input.businessId}:${transaction.transactionId}`;
    const existingWalletTransaction = await walletTransactionRepo.findOne({
      where: { idempotencyKey },
    });

    if (existingWalletTransaction) {
      return existingWalletTransaction;
    }

    const availableBalanceBefore = BigInt(wallet.balance);
    const availableBalanceAfter = availableBalanceBefore + amount;

    await entityManager
      .createQueryBuilder()
      .update(Wallets)
      .set({ balance: () => 'balance + :amount' })
      .where('walletId = :walletId', { walletId: wallet.walletId })
      .setParameter('amount', amount.toString())
      .execute();

    return walletTransactionRepo.save(
      walletTransactionRepo.create({
        businessId: input.businessId,
        environment: input.environment,
        walletId: wallet.walletId,
        reference: `${transaction.transactionId}`,
        providerReference: input.providerReference ?? input.reference,
        transactionType: WalletTransactionType.CREDIT,
        amount: amount.toString(),
        availableBalanceBefore: availableBalanceBefore.toString(),
        availableBalanceAfter: availableBalanceAfter.toString(),
        currency: input.currency,
        narration: 'Settlement wallet credit',
        message: null,
        status: WalletTransactionStatus.COMPLETED,
        source: WalletTransactionSource.SETTLEMENT,
        sourceId,
        idempotencyKey,
        metadata: {
          ...input.metadata,
          transactionId: transaction.transactionId,
          settlementTransactionsId: sourceId,
          merchantReference: input.merchantReference,
          collectionChannel: input.collectionChannel,
        },
      }),
    );
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

  private getFeeSource(
    source: TransactionSource,
    collectionChannel?: CollectionChannel | null,
  ) {
    return collectionChannel ?? source;
  }

  private async resolveSettlementDestination(
    input: CreditWallet,
    wallet: Wallets,
    share: SettlementShare,
    context: CreditSettlementContext,
  ): Promise<SettlementDestination> {
    let settlementBankAccountId = share.settlementBankAccountId;
    let walletId = share.walletId ?? null;

    if (
      this.shouldUsePrimarySettlementAccount(
        settlementBankAccountId,
        walletId,
        context,
      )
    ) {
      const primaryAccount = await this.getPrimaryAccount(
        input.businessId,
        input.environment,
      );

      settlementBankAccountId = primaryAccount?.bankAccountId ?? null;
    }

    if (
      this.shouldUseWalletSettlement(settlementBankAccountId, walletId, context)
    ) {
      walletId = wallet.walletId;
    }

    return { settlementBankAccountId, walletId };
  }

  private shouldUsePrimarySettlementAccount(
    settlementBankAccountId: string | null,
    walletId: string | null,
    context: CreditSettlementContext,
  ) {
    return (
      !context.shouldCreditWalletNow &&
      !walletId &&
      !settlementBankAccountId &&
      context.settlementConfig?.settlementLocation === SettlementLocation.BANK
    );
  }

  private shouldUseWalletSettlement(
    settlementBankAccountId: string | null,
    walletId: string | null,
    context: CreditSettlementContext,
  ) {
    return (
      !walletId &&
      !settlementBankAccountId &&
      (context.shouldCreditWalletNow ||
        context.settlementConfig?.settlementLocation !==
          SettlementLocation.BANK)
    );
  }

  async getSettlementAccounts(scope: RequestScope, name?: string) {
    const { businessId, environment } = getBusinessScope(scope);

    const query = this.settlementAccountRepo
      .createQueryBuilder('settlementAccount')
      .leftJoinAndSelect('settlementAccount.bank', 'bank')
      .where('settlementAccount.businessId = :businessId', {
        businessId,
      })
      .andWhere('settlementAccount.environment = :environment', {
        environment,
      });

    if (name) {
      query.andWhere('settlementAccount.accountName ILIKE :accountName', {
        accountName: `%${name}%`,
      });
    }

    const accounts = await query.getMany();
    return { accounts };
  }
}
