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
  LedgerEntryDirection,
  RequestEnvironment,
  TransactionRiskStatus,
  TransactionSettlementStatus,
  TransactionStatus,
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
import { BusinessSettlementConfigurationService } from 'src/modules/settlement-management/service/settlement_business_config.service';
import {
  BusinessSettlementType,
  SettlementLocation,
} from 'src/modules/settlement-management/entity/business_settlement_config.entity';
import { TRANSACTION_SOURCE_TO_PAYMENT_SOURCE } from 'src/shared/constants/settlement.constants';
import { SettlementAccountResolutionService } from 'src/modules/settlement-management/service/settlement-account-resolution.service';
import { allocateSettlementShares } from 'src/shared/utils';
import { SettlementTransactionsService } from 'src/modules/settlement-management/service/settlement-transactions.service';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(Wallets)
    private readonly walletRepo: Repository<Wallets>,
    private readonly txnService: TransactionService,
    private readonly ledgerService: LedgerService,
    private readonly txnFee: TransactionFeesService,
    private readonly feeConfigService: FeeConfigurationService,
    private readonly webhookService: WebhookService,
    private readonly settlementConfigService: BusinessSettlementConfigurationService,
    private readonly settlementAccountResolutionService: SettlementAccountResolutionService,
    private readonly settlementTransactionsService: SettlementTransactionsService,
  ) {}

  async creditUserWallet(input: CreditWallet) {
    try {
      const { reference, environment, amount, businessId, currency, provider } =
        input;
      /**
       * Keyed off the merchant reference (not our own `reference`) because
       * callers like the POS charge flow mint a fresh internal reference on
       * every attempt, so checking `reference` alone would never catch a
       * retry.
       */
      const dedupeReference = input.merchantReference ?? reference;
      const { providerFee, chargedFee: merchantFee } =
        await this.feeConfigService.getFeeBySource(
          input.source,
          businessId,
          provider,
          amount,
          input.feeCharged
            ? { feature: input.source, feeCollected: input.feeCharged }
            : undefined,
        );
      const totalAmount = BigInt(amount);
      const settledAmount = totalAmount - providerFee;
      const netAmount = totalAmount - merchantFee;

      if (settledAmount < 0n || netAmount < 0n) {
        throw new BadRequestException('Invalid wallet credit amount');
      }

      const result = await this.walletRepo.manager.transaction(
        async (entityManager) => {
          /**
           * Lock the wallet row before doing anything else. Concurrent
           * credits to the same wallet (duplicate webhook delivery, a
           * retried request, etc.) serialize on this lock instead of
           * racing a read-modify-write on `balance` or both slipping past
           * the idempotency check below.
           */
          const wallet = await this.findOrCreateWallet(
            { currency, businessId },
            { environment, businessId, userId: '' },
            entityManager,
            { lock: true },
          );

          if (!wallet) {
            throw new BadRequestException('Wallet creation failed');
          }

          const isProcessed = await this.txnService.getSuccessfulTransaction(
            dedupeReference,
            entityManager,
          );

          if (isProcessed) {
            this.logger.warn(
              `Skipping duplicate wallet credit for merchantReference=${dedupeReference}, businessId=${businessId}`,
            );
            return isProcessed;
          }

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

          const providerLedger =
            await this.ledgerService.findOrCreateLedgerAccount(
              {
                ownerId: provider,
                ownerType: LedgerAccountOwnerType.PROVIDER,
                accountType: LedgerAccountType.PROVIDER_SETTLEMENT,
                currency,
                environment,
              },
              entityManager,
            );

          const revenueLedger =
            await this.ledgerService.findOrCreateLedgerAccount(
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
              amount,
              currency: input.currency,
              entries: [
                {
                  ledgerAccountId: providerLedger.ledgerAccountId,
                  direction: LedgerEntryDirection.DEBIT,
                  amount: settledAmount.toString(),
                  memo: 'Provider settlement receivable',
                },
                {
                  ledgerAccountId: providerFeeExpenseLedger.ledgerAccountId,
                  direction: LedgerEntryDirection.DEBIT,
                  amount: providerFee.toString(),
                  memo: 'Provider collection fee',
                },
                {
                  ledgerAccountId: businessLedgerAccount.ledgerAccountId,
                  direction: LedgerEntryDirection.CREDIT,
                  amount: netAmount.toString(),
                  memo: 'Business wallet credit',
                },
                {
                  ledgerAccountId: revenueLedger.ledgerAccountId,
                  direction: LedgerEntryDirection.CREDIT,
                  amount: merchantFee.toString(),
                  memo: 'Platform collection fee revenue',
                },
              ],
            },
            entityManager,
          );
          const paymentSource =
            TRANSACTION_SOURCE_TO_PAYMENT_SOURCE[input.source];

          const settlementConfig = paymentSource
            ? await this.settlementConfigService.getConfig(
                { businessId, environment },
                paymentSource,
              )
            : null;

          /**
           * Ask feature resolvers (invoice, etc.) whether this reference is
           * attached to anything with its own settlement routing. Safe to
           * call unconditionally — resolve() is a no-op returning
           * `undefined` when nothing claims the reference, e.g. a plain
           * POS/virtual-account credit with no invoice behind it. Each
           * allocation carries a (possibly null) account and its share of
           * the gross amount, since one invoice can legitimately route
           * different items to different settlement accounts.
           */
          const allocations =
            await this.settlementAccountResolutionService.resolve(
              dedupeReference,
            );

          /**
           * A real (non-null) account override always forces deferral — it
           * can never be instant, since routing to a specific bank account
           * is never "instant" the way crediting the wallet is.
           */
          const hasAccountOverride = (allocations ?? []).some(
            (allocation) => allocation.settlementBankAccountId !== null,
          );

          /**
           * No config, or explicitly INSTANT (which the DB constraint
           * guarantees only ever pairs with WALLET) both mean: credit the
           * spendable balance right now, same as before settlement
           * routing existed — unless a specific account override says
           * otherwise.
           */
          const shouldCreditWalletNow =
            !hasAccountOverride &&
            (!settlementConfig ||
              settlementConfig.settlementType ===
                BusinessSettlementType.INSTANT);

          if (shouldCreditWalletNow) {
            await entityManager
              .createQueryBuilder()
              .update(Wallets)
              .set({ balance: () => 'balance + :amount' })
              .where('walletId = :walletId', { walletId: wallet.walletId })
              .setParameter('amount', netAmount.toString())
              .execute();
          } else {
            /**
             * T+1 (WALLET or BANK), or a specific account override: don't
             * touch the spendable balance yet. The nightly settlement job
             * is what eventually credits it (T+1+WALLET) or pays out to
             * the bank (T+1+BANK / override account).
             */
            if (!paymentSource) {
              throw new BadRequestException(
                `Cannot defer settlement for unmapped transaction source: ${input.source}`,
              );
            }

            const settlementType =
              settlementConfig?.settlementType ??
              BusinessSettlementType.T_PLUS_1;

            /**
             * No allocations at all means nothing claimed this reference —
             * one implicit bucket for the whole credit, routed by general
             * config alone. When the business bears the fee, this needs to
             * be `totalAmount` (gross) since allocateSettlementShares
             * subtracts the fee below; when the customer already covered
             * it, there's nothing left to subtract, so it needs to already
             * be `netAmount` — otherwise the bucket would include the fee
             * on top of what the business is actually owed.
             */
            const effectiveAllocations = allocations?.length
              ? allocations
              : [
                  {
                    settlementBankAccountId: null,
                    grossAmount: (input.feeCharged
                      ? netAmount
                      : totalAmount
                    ).toString(),
                  },
                ];

            const shares = allocateSettlementShares(
              effectiveAllocations,
              Boolean(input.feeCharged),
              merchantFee,
            );

            for (const { settlementBankAccountId, amount } of shares) {
              if (amount <= 0n) {
                continue;
              }

              if (
                !settlementBankAccountId &&
                settlementConfig?.settlementLocation === SettlementLocation.BANK
              ) {
                // TODO: general (non-override) BANK settlement still needs
                // a way to resolve *which* SettlementBankAccounts row a
                // business's default config should pay out to — this
                // config only says WALLET vs BANK, not a specific account.
                throw new BadRequestException(
                  'Business settlement configuration resolves to BANK but has no settlement account to route to',
                );
              }

              await this.settlementTransactionsService.upsertUnsettledBucket(
                {
                  businessId,
                  environment,
                  paymentSource,
                  settlementType,
                  settlementBankAccountId,
                  amount,
                },
                entityManager,
              );
            }
          }

          const isTransaction =
            await this.txnService.getTransactionBySystemReference(
              input.reference,
              entityManager,
            );
          const transactionMetadata = {
            ...isTransaction?.metadata,
            ...input.metadata,
            grossAmount: totalAmount.toString(),
            settledAmount: netAmount.toString(),
            merchantFee: merchantFee.toString(),
            providerFee: providerFee.toString(),
          };

          let transaction: Transactions;

          if (isTransaction) {
            transaction =
              await this.txnService.updateTransactionBySystemReference(
                input.reference,
                {
                  settledAmount: netAmount.toString(),
                  fee: merchantFee.toString(),
                  executionStatus: TransactionStatus.SUCCESS,
                  settlementStatus: shouldCreditWalletNow
                    ? TransactionSettlementStatus.SETTLED
                    : TransactionSettlementStatus.UNSETTLED,
                  riskStatus: TransactionRiskStatus.CLEAR,
                  merchantReference:
                    input.merchantReference ?? isTransaction.merchantReference,
                  providerReference: input.providerReference ?? input.reference,
                  sourceId: input.sourceId ?? isTransaction.sourceId,
                  metadata: transactionMetadata,
                  remark: 'Inward credit completed',
                },
                entityManager,
              );
          } else {
            transaction = await this.txnService.createTransaction(
              {
                businessId,
                environment,
                expectedAmount: totalAmount.toString(),
                settledAmount: netAmount.toString(),
                fee: merchantFee.toString(),
                source: input.source,
                reference: input.reference,
                remark: 'Wallet credit completed',
                sourceId: input.sourceId ?? null,
                currency,
                provider,
                executionStatus: TransactionStatus.SUCCESS,
                merchantReference: input.merchantReference ?? input.reference,
                providerReference: input.providerReference ?? input.reference,
                settlementStatus: shouldCreditWalletNow
                  ? TransactionSettlementStatus.SETTLED
                  : TransactionSettlementStatus.UNSETTLED,
                riskStatus: TransactionRiskStatus.CLEAR,
                direction: LedgerEntryDirection.CREDIT,
                idempotencyKey: `wallet-credit:${businessId}:${input.reference}`,
                metadata: transactionMetadata,
              },
              entityManager,
            );
          }

          await this.txnFee.recordTransactionFee(
            {
              transactionId: transaction.transactionId,
              businessId,
              provider,
              feeSource: input.source,
              grossAmount: totalAmount,
              chargedFee: merchantFee,
              providerFee,
            },
            entityManager,
          );

          return transaction;
        },
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
        type: input.source,
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

    const duplicateTxn = await this.txnService.getTransactionByMerchantRef(
      input.reference,
    );

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
    const revenue = merchantFee - providerFee;

    /**
     * Avoid double spend by using database lock.
     */
    await this.walletRepo.manager.transaction(async (entityManager) => {
      const result = await entityManager
        .createQueryBuilder()
        .update(Wallets)
        .set({
          balance: () => 'balance - :amount',
        })
        .where('businessId = :businessId', { businessId })
        .andWhere('currency = :currency', { currency })
        .andWhere('environment = :environment', { environment })
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
      await this.ledgerService.ledgerPosting(
        {
          reference,
          environment,
          businessId: input.businessId,
          transactionType: input.source,
          amount: totalMerchantDebit.toString(),
          currency: input.currency,
          entries: [
            {
              ledgerAccountId: providerLedger.ledgerAccountId,
              direction: LedgerEntryDirection.CREDIT,
              amount: grossPayoutAmount.toString(), //1000 amount we payout from provider wallet
              memo: 'Provider Settlement Payable',
            },
            {
              ledgerAccountId: providerLedger.ledgerAccountId,
              direction: LedgerEntryDirection.CREDIT, //10
              amount: providerFee.toString(),
              memo: 'Provider payout fee deduction',
            },
            {
              ledgerAccountId: businessLedgerAccount.ledgerAccountId,
              direction: LedgerEntryDirection.DEBIT,
              amount: totalMerchantDebit.toString(), //1020
              memo: 'Total payout from merchant  wallet',
            },
            {
              ledgerAccountId: revenueLedger.ledgerAccountId,
              direction: LedgerEntryDirection.CREDIT,
              amount: revenue.toString(), //20
              memo: 'Platform payout  fee revenue',
            },
          ],
        },
        entityManager,
      );
      const transaction = await this.txnService.createTransaction(
        {
          businessId,
          environment,
          expectedAmount: grossPayoutAmount.toString(),
          settledAmount: grossPayoutAmount.toString(),
          fee: merchantFee.toString(),
          source: input.source,
          reference: input.reference,
          remark: input.narration ?? 'Naira payout',
          sourceId: input.sourceId ?? null,
          currency,
          provider,
          executionStatus: TransactionStatus.INITIATED,
          merchantReference: input.merchantReference ?? input.reference,
          providerReference: input.providerReference ?? input.reference,
          settlementStatus: TransactionSettlementStatus.UNSETTLED,
          riskStatus: TransactionRiskStatus.CLEAR,
          direction: LedgerEntryDirection.DEBIT,
          idempotencyKey: `wallet-debit:${businessId}:${input.reference}`,
          metadata: {},
        },
        entityManager,
      );

      return transaction;
    });
  }

  async findOrCreateWallet(
    input: CreateWalletInterface,
    jwtResult: JwtPayload,
    entityManager?: EntityManager,
    options: { lock?: boolean } = {},
  ) {
    const walletRepo = entityManager?.getRepository(Wallets) ?? this.walletRepo;
    const scope = businessScopeFilter(jwtResult);

    const wallet = await walletRepo.findOne({
      where: {
        currency: input.currency,
        ...scope,
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
