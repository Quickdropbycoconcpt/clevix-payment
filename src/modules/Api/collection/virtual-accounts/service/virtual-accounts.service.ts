import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CollectionAdapterFactory } from '../../adapters/collection.adapter.factory';
import { CollectionProvider } from '../../adapters/contracts/collection-adapter.types';
import {
  CorporateAccountResponse,
  CreateVirtualAccountResult,
  IndividualStaticAccountResponse,
  VirtualAccountCreditResponse,
} from '../../adapters/contracts/virtual-account.adapter';
import { CreateDynamicVirtualAccountDto } from '../dto/create-dynamic-virtual-account.dto';
import { RequestScope, getBusinessScope } from 'src/shared/business-scope';
import { Repository } from 'typeorm';
import { DynamicVirtualAccounts } from '../entity/dynamic_va.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { SimulateInwardCreditDto } from '../dto/simulate-credit.dto';
import {
  BasicStatus,
  CollectionChannel,
  LedgerEntryDirection,
  RequestEnvironment,
  TransactionSource,
  TransactionStatus,
} from 'src/shared/enum';
import * as Crypto from 'node:crypto';
import { VirtualAccountCreditQueue } from '../jobs/virtual-account-credit.queue';
import { TransactionService } from 'src/modules/transactions/service/transaction.service';
import {
  AccountType,
  CreateCorporateStaticAccountDto,
  CreateIndividualStaticAccountDto,
} from '../dto/create-static-account.dto';
import { StaticWalletAccounts } from '../entity/wallet_account.entity';
import { CreateDynamicVirtualAccountInput } from '../interface/virtual-account.interface';

type DynamicVirtualAccountInput = CreateDynamicVirtualAccountInput & {
  transactionSource?: TransactionSource;
};

@Injectable()
export class VirtualAccountsService {
  private readonly logger = new Logger(VirtualAccountsService.name);
  private clearingExpiredDynamicAccounts = false;

  constructor(
    private readonly collectionAdapterFactory: CollectionAdapterFactory,
    private readonly virtualAccountCreditQueue: VirtualAccountCreditQueue,
    @InjectRepository(DynamicVirtualAccounts)
    private readonly dvaRepo: Repository<DynamicVirtualAccounts>,
    @InjectRepository(StaticWalletAccounts)
    private readonly walletAcct: Repository<StaticWalletAccounts>,
    private readonly txnService: TransactionService,
  ) {}
  async generateDynamicVirtualAccount(
    dto: DynamicVirtualAccountInput,
    scope: RequestScope,
  ): Promise<CreateVirtualAccountResult> {
    const businessScope = getBusinessScope(scope);
    const ref = await this.dvaRepo.findOne({
      where: { merchantReference: dto.reference },
    });
    if (ref) {
      throw new BadRequestException('Reference exist');
    }
    const txnExisit = await this.txnService.getTransactionByMerchantRef(
      dto.reference,
    );
    if (txnExisit) {
      throw new BadRequestException('Reference exist');
    }
    const provider = dto.provider ?? CollectionProvider.VFD;
    const adapter =
      this.collectionAdapterFactory.getVirtualAccountAdapter(provider);
    const validityTime = dto.validityTime;
    const ourRef = `CLV-${Crypto.randomUUID()}`;
    const result = await adapter.createVirtualAccount({
      ...businessScope,
      reference: ourRef,
      merchantReference: dto.reference,
      accountName: dto.accountName.trim(),
      amount: dto.amount,
      amountValidation: 'A0',
      customerEmail: dto.customerEmail?.trim().toLowerCase(),
      validityTime,
    });
    console.log(result);
    if (!result?.accountNumber) {
      throw new InternalServerErrorException(
        'Something went wrong. Please try again later',
      );
    }
    await this.dvaRepo.manager.transaction(async (entityManager) => {
      const dva = entityManager.create(DynamicVirtualAccounts, {
        merchantReference: dto.reference,
        accountNumber: result.accountNumber,
        provider,
        reference: result.reference,
        businessId: scope.businessId,
        validityTime,
        environment: scope.environment,
        feeCharged: null,
      });
      await entityManager.save(dva);
      await this.txnService.createTransaction(
        {
          expectedAmount: dto.amount,
          settledAmount: '0',
          businessId: scope.businessId,
          reference: ourRef,
          provider,
          currency: 'NGN',
          source: dto.transactionSource ?? TransactionSource.WALLET_FUNDING,
          collectionChannel: CollectionChannel.VIRTUAL_ACCOUNT,
          environment: scope.environment,
          direction: LedgerEntryDirection.CREDIT,
          executionStatus: TransactionStatus.INITIATED,
          sourceId: dva.dvaId,
          merchantReference: dto.reference,
          providerReference: ourRef,
          idempotencyKey: `virtual-account:${scope.businessId}:${dto.reference}`,
          remark: 'Virtual account collection initiated',
          metadata: {
            accountName: result.accountName,
            accountNumber: result.accountNumber,
            bankName: result.bankName,
            validityTime,
          },
        },
        entityManager,
      );
    });

    return result;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async clearExpiredDynamicAccountsCron() {
    if (this.clearingExpiredDynamicAccounts) {
      return;
    }

    this.clearingExpiredDynamicAccounts = true;

    try {
      const expiredCount = await this.clearExpiredDynamicAccounts();

      if (expiredCount > 0) {
        this.logger.log(
          `Marked ${expiredCount} expired dynamic virtual accounts as inactive`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to clear expired dynamic virtual accounts',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.clearingExpiredDynamicAccounts = false;
    }
  }

  async clearExpiredDynamicAccounts(): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const result = await this.dvaRepo
      .createQueryBuilder()
      .update(DynamicVirtualAccounts)
      .set({
        status: BasicStatus.INACTIVE,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where('"status" = :status', { status: BasicStatus.ACTIVE })
      .andWhere('"createdAt" <= :oneHourAgo', { oneHourAgo })
      .execute();

    return result.affected ?? 0;
  }

  async simulateCredit(input: SimulateInwardCreditDto) {
    let walletAccount: StaticWalletAccounts;
    const dva = await this.dvaRepo.findOne({
      where: { accountNumber: input.accountNumber, status: BasicStatus.ACTIVE },
    });
    if (!dva) {
      walletAccount = await this.walletAcct.findOne({
        where: { accountNumber: input.accountNumber.trim() },
      });
    }

    if (!walletAccount && !dva) {
      throw new BadRequestException('Invalid request');
    }

    const adapter = this.collectionAdapterFactory.getVirtualAccountAdapter(
      dva?.provider ?? walletAccount.provider,
    );
    return await adapter.simulateIncomingCredit({
      amount: input.amount,
      reference: dva?.reference,
      accountNumber: input.accountNumber ?? dva.accountNumber,
      environment: RequestEnvironment.TEST,
    });
  }

  async createIndividualStaticAccount(
    dto: CreateIndividualStaticAccountDto,
    scope: RequestScope,
  ) {
    const provider = CollectionProvider.VFD;
    const adapter =
      this.collectionAdapterFactory.getVirtualAccountAdapter(provider);
    const acct = await this.walletAcct
      .createQueryBuilder('wallet')
      .where('wallet.bvn = :bvn', { bvn: dto?.bvn.trim() })
      .orWhere('wallet.nin = :nin', { nin: dto?.nin.trim() })
      .getOne();
    if (acct && acct.businessId != scope.businessId) {
      /**
       * Generate with previous number
       * Else generate new account number
       */
    } else if (acct) {
      const res: IndividualStaticAccountResponse = {
        accountName: acct.accountName,
        accountNumber: acct.accountNumber,
        bankName: acct.provider.toUpperCase(),
      };
      return res;
    }
    const res = await adapter.createIndividualStaticAccount({
      environment: scope.environment,
      ...dto,
    });
    /**
     * if a user already have account with a provider... by another business.
     * Then generate new account for the calling business using the previousAccount..
     * PS: this might change per provider
     */

    const wallet = this.walletAcct.create({
      accountNumber: res.accountNumber,
      bvn: dto.bvn.trim(),
      nin: dto.nin.trim(),
      environment: scope.environment,
      businessId: scope.businessId,
      accountType: AccountType.INDIVIDUAL,
      address: dto.address.trim(),
      provider,
      accountName: `${res.lastname} ${res.firstName}`,
    });
    await this.walletAcct.save(wallet);
    return res;
  }

  async createCorporateStaticAccount(
    dto: CreateCorporateStaticAccountDto,
    scope: RequestScope,
  ) {
    const provider = CollectionProvider.VFD;
    const adapter =
      this.collectionAdapterFactory.getVirtualAccountAdapter(provider);
    /**
     * if a user already have account with a provider... by another business.
     * Then generate new account for the calling business using the previousAccount..
     * PS: this might change per provider
     */
    const acct = await this.walletAcct.findOne({
      where: { rcNumber: dto.rcNumber, provider },
    });

    if (acct && acct.businessId != scope.businessId) {
      /**
       * Generate with previous number
       * Else generate new account number
       */
    } else if (acct) {
      const res: CorporateAccountResponse = {
        accountName: acct.accountName,
        accountNumber: acct.accountName,
        bankName: acct.provider.toUpperCase(),
      };
      return res;
    }
    const res = await adapter.createBusinessStaticAccount({
      environment: scope.environment,
      ...dto,
    });
    const wallet = this.walletAcct.create({
      accountNumber: res.accountNumber,
      rcNumber: dto.rcNumber.trim(),
      businessId: scope.businessId,
      environment: scope.environment,
      accountType: AccountType.CORPORATE,
      address: dto.address,
      provider,
      accountName: res.accountName,
    });
    /**
     * Save the new wallet details.
     *
     */
    await this.walletAcct.save(wallet);
    return res;
  }

  async incomingWebhook(
    body: any,
    provider: string,
  ): Promise<VirtualAccountCreditResponse> {
    const adapter =
      this.collectionAdapterFactory.getVirtualAccountAdapter(provider);
    const result = adapter.incomingPaymentWebhook(body);
    if (!result?.receivedAccountNumber) {
      return;
    }
    let dva = await this.dvaRepo.findOne({
      where: {
        accountNumber: result.receivedAccountNumber,
        status: BasicStatus.ACTIVE,
      },
    });

    let walletAccount: StaticWalletAccounts;

    if (!dva) {
      walletAccount = await this.walletAcct.findOne({
        where: { accountNumber: result.receivedAccountNumber },
      });
    }

    if (!walletAccount && !dva) {
      throw new BadRequestException('Invalid receiving account');
    }

    if (dva) {
      await this.dvaRepo.update(
        {
          accountNumber: result.receivedAccountNumber,
          status: BasicStatus.ACTIVE,
        },
        { status: BasicStatus.INACTIVE, updatedAt: new Date() },
      );
    }
    const sourceTransaction = dva
      ? await this.txnService.getTransactionByMerchantRef(dva.merchantReference)
      : null;

    await this.virtualAccountCreditQueue.addCreditJob({
      dvaId: walletAccount?.walletAccountId ?? dva?.dvaId,
      businessId: walletAccount?.businessId ?? dva?.businessId,
      source: sourceTransaction?.source ?? TransactionSource.WALLET_FUNDING,
      collectionChannel:
        sourceTransaction?.collectionChannel ??
        CollectionChannel.VIRTUAL_ACCOUNT,
      environment: walletAccount?.environment ?? dva?.environment,
      provider: walletAccount?.provider ?? dva?.provider,
      merchantReference:
        dva?.merchantReference ?? result.reference ?? result.sessionId,
      credit: result,
      feeCharged: dva?.feeCharged,
    });

    return {
      ...result,
      reference: dva?.merchantReference ?? result.reference,
    };
  }
}
