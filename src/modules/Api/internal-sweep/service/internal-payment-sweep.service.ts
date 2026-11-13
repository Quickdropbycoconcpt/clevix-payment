import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TransferAdapterFactory } from 'src/modules/Api/transfers/adapters/transfer.adapter.factory';
import { StaticWalletAccounts } from 'src/modules/Api/collection/virtual-accounts/entity/wallet_account.entity';
import { RequestEnvironment, TransactionStatus } from 'src/shared/enum';
import { generateRrn, toIntegerAmountBigInt } from 'src/shared/utils';
import {
  CorporateAccountSweep,
  StaticAccountSweep,
  SweepDirection,
  SweepType,
} from '../interface/sweep-transfer.interface';
import { InternalCoporateAccount } from '../entity/internal-accounts.entity';
import { TransferStatusResult } from 'src/modules/Api/transfers/types/transfer-provider';
import { SweepPaymentTransactions } from '../entity/sweep-transactions.entity';

type ExecuteSweepInput = {
  provider: string;
  environment: string;
  businessId: string | null;
  staticAccountId: string | null;
  direction: SweepDirection;
  type: SweepType;
  amount: string;
  reference: string;
  fromAccount: string;
  toAccount: string;
  toBankCode: string;
};

@Injectable()
export class InternalPaymentSweepService {
  private readonly logger = new Logger(InternalPaymentSweepService.name);

  constructor(
    private readonly transferAdapterFactory: TransferAdapterFactory,
    @InjectRepository(StaticWalletAccounts)
    private readonly staticAccountRepo: Repository<StaticWalletAccounts>,
    @InjectRepository(InternalCoporateAccount)
    private readonly internalAccountRepo: Repository<InternalCoporateAccount>,
    @InjectRepository(SweepPaymentTransactions)
    private readonly sweepTransactionRepo: Repository<SweepPaymentTransactions>,
  ) {}
  private readonly mainCorporateAccount = '1038227462';
  async sweepCorporateToStatic(input: StaticAccountSweep) {
    const staticAccount = await this.getStaticAccount(
      input.staticAccountNumber,
    );
    const corporateAccount = await this.getCorporateAccount(
      staticAccount.provider,
    );

    return this.executeSweep({
      ...this.staticAccountContext(staticAccount),
      direction: SweepDirection.CORPORATE_TO_STATIC,
      type: input.type,
      amount: input.amount,
      reference: input.reference,
      fromAccount: corporateAccount.accountNumber,
      toAccount: staticAccount.accountNumber,
      toBankCode: corporateAccount.bankCode,
    });
  }

  async sweepStaticToCorporate(input: StaticAccountSweep) {
    const staticAccount = await this.getStaticAccount(
      input.staticAccountNumber,
    );
    const corporateAccount = await this.getCorporateAccount(
      staticAccount.provider,
    );

    return this.executeSweep({
      ...this.staticAccountContext(staticAccount),
      direction: SweepDirection.STATIC_TO_CORPORATE,
      type: input.type,
      amount: input.amount,
      reference: input.reference,
      fromAccount: staticAccount.accountNumber,
      toAccount: corporateAccount.accountNumber,
      toBankCode: corporateAccount.bankCode,
    });
  }

  async sweepSubCorporateToCorporate(input: CorporateAccountSweep) {
    const toAccount = await this.getCorporateAccountByAccountNumber(
      input.mainCorporateAccount,
    );
    return this.executeSweep({
      provider: toAccount.provider,
      environment: input.environment,
      businessId: null,
      staticAccountId: null,
      direction: SweepDirection.CORPORATE_TO_CORPORATE,
      type: input.type,
      amount: input.amount,
      reference: input.reference,
      fromAccount: this.mainCorporateAccount,
      toAccount: toAccount.accountNumber,
      toBankCode: toAccount.bankCode,
    });
  }

  // @Cron(CronExpression.EVERY_10_MINUTES)
  async VFDLUXSWEEP() {
    const subAccountNumber = process.env.VFD_LUX;

    if (!subAccountNumber) {
      throw new BadRequestException('VFD_LUX  must be configured');
    }

    const subAccount =
      await this.getCorporateAccountByAccountNumber(subAccountNumber);

    const inFlightSweep = await this.sweepTransactionRepo.findOne({
      where: {
        fromAccount: subAccount.accountNumber,
        status: In([TransactionStatus.INITIATED, TransactionStatus.PROCESSING]),
      },
    });

    if (inFlightSweep) {
      this.logger.log(
        `Skipping VFD LUX sweep: reference=${inFlightSweep.reference} still in flight`,
      );
      return null;
    }

    const adapter = this.transferAdapterFactory.getTransferdapter(
      subAccount.provider,
    );
    const { balance } = await adapter.accountBalanceEnquiry({
      environment: RequestEnvironment.LIVE,
      accountNumber: subAccount.accountNumber,
    });

    if (BigInt(balance) <= 0n) {
      this.logger.log('Skipping VFD LUX sweep: balance is zero');
      return null;
    }

    return this.sweepSubCorporateToCorporate({
      type: SweepType.DEPOSIT,
      subAccountNumber,
      mainCorporateAccount: this.mainCorporateAccount,
      environment: RequestEnvironment.LIVE,
      amount: balance,
      reference: `VFDLUX-${generateRrn()}`,
    });
  }

  @Cron('*/3 * * * *')
  async confirmSweepTransactionStatus() {
    try {
      const processingSweeps = await this.sweepTransactionRepo.find({
        where: { status: TransactionStatus.PROCESSING },
        order: { createdAt: 'ASC' },
        take: 200,
      });

      if (processingSweeps.length === 0) {
        return;
      }

      await Promise.allSettled(
        processingSweeps.map(async (sweep) => {
          const adapter = this.transferAdapterFactory.getTransferdapter(
            sweep.provider,
          );
          const result = await adapter.transactionStatusQuery({
            environment: sweep.environment,
            reference: sweep.reference,
          });

          if (result.status !== TransferStatusResult.SUCCESS) {
            return;
          }

          await this.sweepTransactionRepo.update(
            { sweepTransactionId: sweep.sweepTransactionId },
            { status: TransactionStatus.SUCCESS },
          );

          this.logger.log(`Confirmed sweep reference=${sweep.reference}`);
        }),
      );
    } catch (error) {
      this.logger.error(
        'Failed to confirm sweep transaction status',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async executeSweep(input: ExecuteSweepInput) {
    const { provider, environment, direction, amount } = input;
    const reference = input.reference.trim();

    if (toIntegerAmountBigInt(amount, 'amount') <= 0n) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const existingSweep = await this.sweepTransactionRepo.findOne({
      where: { reference },
    });

    if (existingSweep) {
      throw new ConflictException('Sweep reference already exists');
    }

    const sweepTransaction = await this.sweepTransactionRepo.save(
      this.sweepTransactionRepo.create({
        businessId: input.businessId,
        staticAccountId: input.staticAccountId,
        environment,
        reference,
        amount,
        type: input.type,
        direction,
        fromAccount: input.fromAccount,
        toAccount: input.toAccount,
        provider,
        status: TransactionStatus.INITIATED,
      }),
    );

    const adapter = this.transferAdapterFactory.getTransferdapter(provider);

    try {
      await adapter.processPaypout({
        senderAccount: input.fromAccount,
        accountNumber: input.toAccount,
        accountName: input.toAccount,
        bankCode: input.toBankCode,
        amount,
        narration: `Internal sweep ${input.type}`,
        reference,
        merchantReference: reference,
        currency: 'NGN',
        environment,
        provider,
      });

      await this.sweepTransactionRepo.update(
        { sweepTransactionId: sweepTransaction.sweepTransactionId },
        { status: TransactionStatus.PROCESSING },
      );

      this.logger.log(
        `Initiated sweep reference=${reference} direction=${direction} amount=${amount}`,
      );

      return { reference, status: TransactionStatus.PROCESSING };
    } catch (error) {
      await this.sweepTransactionRepo.update(
        { sweepTransactionId: sweepTransaction.sweepTransactionId },
        { status: TransactionStatus.FAILED },
      );

      this.logger.error(
        `Failed sweep reference=${reference} direction=${direction}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new BadRequestException('Unable to initiate sweep');
    }
  }

  private staticAccountContext(staticAccount: StaticWalletAccounts) {
    return {
      provider: staticAccount.provider,
      environment: staticAccount.environment,
      businessId: staticAccount.businessId,
      staticAccountId: staticAccount.walletAccountId,
    };
  }

  private async getStaticAccount(accountNumber: string) {
    const staticAccount = await this.staticAccountRepo.findOne({
      where: { accountNumber: accountNumber?.trim() },
    });

    if (!staticAccount) {
      throw new NotFoundException('Static account not found');
    }

    return staticAccount;
  }

  private async getCorporateAccount(provider: string) {
    const corporateAccount = await this.internalAccountRepo.findOne({
      where: { provider, isDefault: true },
    });

    if (!corporateAccount) {
      throw new NotFoundException(
        `No default internal corporate account configured for ${provider}`,
      );
    }

    return corporateAccount;
  }

  private async getCorporateAccountByAccountNumber(accountNumber: string) {
    const corporateAccount = await this.internalAccountRepo.findOne({
      where: { accountNumber },
    });

    if (!corporateAccount) {
      throw new NotFoundException(
        `No default internal corporate account configured `,
      );
    }

    return corporateAccount;
  }
}
