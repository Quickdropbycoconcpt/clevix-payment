import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager, In, Repository } from 'typeorm';
import { LedgerAccount } from '../entity/ledger-account.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { LedgerTransaction } from '../entity/ledger-transaction.entity';
import { LedgerEntry } from '../entity/ledger-entry.entity';
import {
  CreateBusinessLedgeAccount,
  FindOrCreateLedgerAccountInput,
  GetLedgerDerivedBalanceInput,
  LedgerPostingInput,
} from '../interface/ledger-interface';
import {
  LedgerAccountType,
  LedgerAccountOwnerType,
  LedgerTransactionStatus,
} from '../enums/ledger.enums';
import { LedgerEntryDirection } from 'src/shared/enum';
import { toIntegerAmountBigInt } from 'src/shared/utils';

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerAccount)
    private readonly ledgerAccount: Repository<LedgerAccount>,
    @InjectRepository(LedgerTransaction)
    private readonly ledgerTransactions: Repository<LedgerTransaction>,
    @InjectRepository(LedgerEntry)
    private readonly ledgerEntry: Repository<LedgerEntry>,
  ) {}

  async setupBusinessLedgerAccount(
    input: CreateBusinessLedgeAccount,
    entityManager: EntityManager,
  ) {
    const entity = entityManager.create(LedgerAccount, {
      ownerId: input.businessId,
      ownerType: LedgerAccountOwnerType.BUSINESS,
      currency: input.currency,
    });

    return entityManager.save(entity);
  }

  async ledgerPosting(input: LedgerPostingInput, entityManager: EntityManager) {
    const { environment, amount, currency, entries } = input;

    if (!entries.length) {
      throw new BadRequestException('Ledger posting requires entries');
    }

    const expectedAmount = toIntegerAmountBigInt(amount, 'Ledger amount');
    let totalDebit = 0n;
    let totalCredit = 0n;

    for (const entry of entries) {
      const entryAmount = toIntegerAmountBigInt(
        entry.amount,
        'Ledger entry amount',
      );

      if (entryAmount <= 0n) {
        throw new BadRequestException('Ledger entry amount must be positive');
      }

      if (entry.direction === LedgerEntryDirection.DEBIT) {
        totalDebit += entryAmount;
      }

      if (entry.direction === LedgerEntryDirection.CREDIT) {
        totalCredit += entryAmount;
      }
    }

    if (totalDebit !== totalCredit) {
      throw new BadRequestException('Ledger posting is not balanced');
    }

    if (totalDebit !== expectedAmount) {
      console.log(expectedAmount);
      throw new BadRequestException('Ledger posting amount does not match');
    }

    const transaction = entityManager.create(LedgerTransaction, {
      reference: input.reference,
      transactionType: input.transactionType,
      status: LedgerTransactionStatus.POSTED,
      description: input.description,
      metadata: input.metadata,
      environment,
    });
    const txn = await entityManager.save(LedgerTransaction, transaction);
    const ledgerEntries = entityManager.create(
      LedgerEntry,
      entries.map((entry) => ({
        ledgerTransactionId: txn.ledgerTransactionId,
        ledgerAccountId: entry.ledgerAccountId,
        direction: entry.direction,
        amount: toIntegerAmountBigInt(
          entry.amount,
          'Ledger entry amount',
        ).toString(),
        currency,
        memo: entry.memo,
        environment,
      })),
    );
    const savedEntries = await entityManager.save(LedgerEntry, ledgerEntries);
    await this.updateLedgerAccountBalances(
      entries,
      currency,
      environment,
      entityManager,
    );

    return {
      ...txn,
      entries: savedEntries,
    };
  }

  async getLedgerTransactionByReference(
    reference: string,
    entityManager?: EntityManager,
  ) {
    const repository =
      entityManager?.getRepository(LedgerTransaction) ??
      this.ledgerTransactions;

    return repository.findOne({ where: { reference } });
  }

  async getLedgerAccount(ownerId: string) {
    return await this.ledgerAccount.findOne({ where: { ownerId } });
  }

  async findOrCreateLedgerAccount(
    input: FindOrCreateLedgerAccountInput,
    entityManager?: EntityManager,
  ) {
    const repository =
      entityManager?.getRepository(LedgerAccount) ?? this.ledgerAccount;
    const lookup = {
      ownerId: input.ownerId ?? null,
      ownerType: input.ownerType,
      accountType: input.accountType,
      currency: input.currency,
      environment: input.environment,
    };
    const existingAccount = await repository.findOne({
      where: lookup,
    });

    if (existingAccount) {
      return existingAccount;
    }

    const account = repository.create({
      ...lookup,
      isActive: true,
    });

    return repository.save(account);
  }

  async getLedgerDerivedBalance(
    input: GetLedgerDerivedBalanceInput,
    entityManager?: EntityManager,
  ): Promise<{
    ledgerAccountId: string;
    balance: string;
  }> {
    const ledgerAccountRepo =
      entityManager?.getRepository(LedgerAccount) ?? this.ledgerAccount;
    const ledgerAccount = await ledgerAccountRepo.findOne({
      where: input.ledgerAccountId
        ? {
            ledgerAccountId: input.ledgerAccountId,
          }
        : {
            ownerId: input.ownerId ?? null,
            ownerType: input.ownerType,
            accountType: input.accountType,
            currency: input.currency,
            environment: input.environment,
          },
    });

    if (!ledgerAccount) {
      throw new BadRequestException('Ledger account not found');
    }

    return {
      ledgerAccountId: ledgerAccount.ledgerAccountId,
      balance: ledgerAccount.balance,
    };
  }

  private async updateLedgerAccountBalances(
    entries: LedgerPostingInput['entries'],
    currency: string,
    environment: string,
    entityManager: EntityManager,
  ) {
    const ledgerAccountIds = [
      ...new Set(entries.map((entry) => entry.ledgerAccountId)),
    ];
    const ledgerAccounts = await entityManager.find(LedgerAccount, {
      where: {
        ledgerAccountId: In(ledgerAccountIds),
      },
    });

    if (ledgerAccounts.length !== ledgerAccountIds.length) {
      throw new BadRequestException('One or more ledger accounts do not exist');
    }

    const ledgerAccountById = new Map(
      ledgerAccounts.map((account) => [account.ledgerAccountId, account]),
    );
    const balanceDeltas = new Map<string, bigint>();

    for (const entry of entries) {
      const ledgerAccount = ledgerAccountById.get(entry.ledgerAccountId);

      if (!ledgerAccount) {
        throw new BadRequestException('Ledger account not found');
      }

      if (
        ledgerAccount.currency !== currency ||
        ledgerAccount.environment !== environment
      ) {
        throw new BadRequestException(
          'Ledger account does not match posting scope',
        );
      }

      const currentDelta = balanceDeltas.get(entry.ledgerAccountId) ?? 0n;
      const entryAmount = toIntegerAmountBigInt(
        entry.amount,
        'Ledger entry amount',
      );
      const balanceDelta = this.getLedgerAccountBalanceDelta(
        ledgerAccount.accountType,
        entry.direction,
        entryAmount,
      );

      balanceDeltas.set(entry.ledgerAccountId, currentDelta + balanceDelta);
    }

    for (const [ledgerAccountId, delta] of balanceDeltas) {
      if (delta === 0n) {
        continue;
      }

      await entityManager.query(
        `UPDATE "ledger_accounts"
         SET "balance" = "balance" + $1::bigint,
             "updatedAt" = now()
         WHERE "ledgerAccountId" = $2`,
        [delta.toString(), ledgerAccountId],
      );
    }
  }

  private getLedgerAccountBalanceDelta(
    accountType: LedgerAccountType,
    direction: LedgerEntryDirection,
    amount: bigint,
  ): bigint {
    const debitNormalAccountTypes = new Set<LedgerAccountType>([
      LedgerAccountType.PENDING_COLLECTION,
      LedgerAccountType.PROVIDER_SETTLEMENT,
      LedgerAccountType.PROVIDER_FEE_EXPENSE,
      LedgerAccountType.CHARGEBACKS,
    ]);
    const creditNormalAccountTypes = new Set<LedgerAccountType>([
      LedgerAccountType.CUSTOMER_CASH,
      LedgerAccountType.SETTLEMENT_PAYABLE,
      LedgerAccountType.FEES_REVENUE,
      LedgerAccountType.PAYOUTS_CLEARING,
    ]);

    if (debitNormalAccountTypes.has(accountType)) {
      return direction === LedgerEntryDirection.DEBIT ? amount : -amount;
    }

    if (creditNormalAccountTypes.has(accountType)) {
      return direction === LedgerEntryDirection.CREDIT ? amount : -amount;
    }

    throw new BadRequestException(
      `Unsupported ledger account type: ${accountType}`,
    );
  }
}
