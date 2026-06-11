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
import { FeeConfigurationService } from 'src/modules/fees-configuration/service/fees_revenue.service';
import { TransactionFeesService } from 'src/modules/transaction_fees/service/transaction_fees.service';

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
  ) {}

  async creditUserWallet(input: CreditWallet) {
    try {
      const { reference, environment, amount, businessId, currency, provider } =
        input;
      /***
       * Early return for already successful transactions
       */
      // const isProcessed =
      //   await this.txnService.getSuccessfulTransaction(reference);
      // if (isProcessed) {
      //   return;
      // }
      const { providerFee, chargedFee: merchantFee } =
        await this.feeConfigService.getFeeBySource(
          input.source,
          businessId,
          provider,
          amount,
        );
      const totalAmount = BigInt(amount);
      const settledAmount = totalAmount - providerFee;
      const netAmount = totalAmount - merchantFee;

      if (settledAmount < 0n || netAmount < 0n) {
        throw new BadRequestException('Invalid wallet credit amount');
      }

      await this.walletRepo.manager.transaction(async (entityManager) => {
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
        const wallet = await this.findOrCreateWallet(
          {
            currency,
            businessId,
          },
          { environment, businessId, userId: '' },
          entityManager,
        );
        if (!wallet) {
          throw new BadRequestException('Wallet creation failed');
        }
        const newBalance = BigInt(wallet.balance) + netAmount;
        await entityManager.update(
          Wallets,
          { walletId: wallet.walletId },
          { balance: newBalance.toString() },
        );

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

        let transaction;

        if (isTransaction) {
          transaction =
            await this.txnService.updateTransactionBySystemReference(
              input.reference,
              {
                settledAmount: netAmount.toString(),
                fee: merchantFee.toString(),
                executionStatus: TransactionStatus.SUCCESS,
                settlementStatus: TransactionSettlementStatus.SETTLED,
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
              settlementStatus: TransactionSettlementStatus.SETTLED,
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
      });
    } catch (error) {
      this.logger.error(
        `Failed to credit wallet for reference=${input?.reference}, businessId=${input?.businessId}, provider=${input?.provider}, source=${input?.source}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
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
      return;
      return transaction;
    });
  }

  async findOrCreateWallet(
    input: CreateWalletInterface,
    jwtResult: JwtPayload,
    entityManager?: EntityManager,
  ) {
    const walletRepo = entityManager?.getRepository(Wallets) ?? this.walletRepo;
    const scope = businessScopeFilter(jwtResult);

    const wallet = await walletRepo.findOne({
      where: {
        currency: input.currency,
        ...scope,
      },
      // lock: { mode: 'pessimistic_write' },
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
