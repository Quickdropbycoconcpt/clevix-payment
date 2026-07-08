import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Crypto from 'node:crypto';
import { BusinessService } from 'src/modules/businesses/service/business.service';
import { TransactionService } from 'src/modules/transactions/service/transaction.service';
import { WalletService } from 'src/modules/wallets/service/wallets.service';
import {
  BasicStatus,
  LedgerEntryDirection,
  TransactionSource,
  TransactionStatus,
} from 'src/shared/enum';
import { CollectionAdapterFactory } from '../../adapters/collection.adapter.factory';
import { CollectionProvider } from '../../adapters/contracts/collection-adapter.types';
import { ChargePosResult } from '../../adapters/contracts/pos.adapter';
import { ChargePosDto } from '../dto/charge-pos.dto';
import { RequestScope, getBusinessScope } from 'src/shared/business-scope';
import { generateRrn, randomNumber } from 'src/shared/utils';
import { PosTransactions } from '../entity/pos_transactions.entity';
import { PosTerminalService } from './pos_terminal.service';

const SUCCESS_RESPONSE_CODE = '00';

const CURRENCY_NAME_TO_ISO_CODE: Record<string, string> = {
  NAIRA: 'NGN',
};

type ChargePosResponse = ChargePosResult & {
  rrn: string;
  stan: string;
};

@Injectable()
export class PosService {
  constructor(
    private readonly collectionAdapterFactory: CollectionAdapterFactory,
    private readonly walletService: WalletService,
    private readonly transactionService: TransactionService,
    private readonly businessService: BusinessService,
    private readonly posTerminalService: PosTerminalService,
    @InjectRepository(PosTransactions)
    private readonly posTransactionsRepo: Repository<PosTransactions>,
  ) {}

  async chargePos(
    dto: ChargePosDto,
    scope: RequestScope,
  ): Promise<ChargePosResponse> {
    const referenceExist =
      await this.transactionService.getTransactionByMerchantRef(dto.reference);
    if (referenceExist) {
      throw new BadRequestException('Reference already exists');
    }
    const businessScope = getBusinessScope(scope);
    const merchant = await this.businessService.findBusinessByIdentifier(
      dto.businessIdentifier,
    );

    if (dto.businessIdentifier && !merchant) {
      throw new BadRequestException('Merchant not found for identifier');
    }

    if (merchant && !merchant.isActive) {
      throw new BadRequestException('Merchant is not active');
    }

    const terminal = await this.posTerminalService.findBySerialNumber(
      dto.serialNumber,
    );

    if (!terminal) {
      throw new BadRequestException('Terminal not found');
    }

    if (terminal.status !== BasicStatus.ACTIVE) {
      throw new BadRequestException('Terminal is not active');
    }

    if (terminal.businessId !== businessScope.businessId) {
      throw new BadRequestException(
        'Terminal does not belong to this business',
      );
    }

    // Funds always land in the merchant's wallet, whether or not the
    // terminal charging the card belongs to that merchant.
    const creditBusinessId = merchant?.businessId ?? businessScope.businessId;
    const provider = CollectionProvider.VFD;
    const adapter = this.collectionAdapterFactory.getPosAdapter(provider);
    const {
      iccData,
      pan,
      accountType,
      source,
      pin,
      track2Data,
      serialNumber,
      sequenceNumber,
      cardExpiryDate,
    } = dto;
    const rrn = generateRrn();
    const stan = randomNumber(6);
    const reference = dto.reference;
    const currency = this.normalizeCurrency(dto.currency);

    const result = await adapter.chargePos({
      ...businessScope,
      iccData,
      pan,
      cardExpiryDate,
      source,
      accountType,
      sequenceNumber,
      serialNumber,
      acquiringInstitutionalCode: '53998359',
      rrn,
      stan,
      track2Data,
      type: 'CARD',
      pin,
      latitude: 0,
      longitude: 0,
      reference,
      amount: dto.amount,
      currency,
      customerEmail: dto.customerEmail?.trim().toLowerCase(),
    });

    const executionStatus = this.resolveExecutionStatus(result);
    const lastFour = pan.slice(-4);
    const firstSixDigit = pan.slice(0, 6);
    const posTransaction = this.posTransactionsRepo.create({
      businessId: businessScope.businessId,
      merchantIdentifier: dto.businessIdentifier ?? businessScope.businessId,
      purpose: dto.purpose ?? null,
      terminalSerialNumber: dto.serialNumber,
      accountOrItemId: dto.accountOrItemId ?? null,
      environment: businessScope.environment,
      rrn,
      stan,
      amount: dto.amount,
      reference,
      lastFour,
      firstSixDigit,
      status: executionStatus,
      description: result.status,
    });
    await this.posTransactionsRepo.save(posTransaction);
    /**
     * Only successful charges move money, so only they get credited to the
     * wallet and posted to the ledger. Failed attempts still get a
     * transactions row (for visibility/history) but skip wallet credit and
     * ledger posting entirely. Crediting always targets the resolved
     * merchant's business, not the terminal operator's.
     */
    const ourRef = `CLV-${Crypto.randomUUID()}`;
    if (executionStatus === TransactionStatus.SUCCESS) {
      await this.walletService.creditUserWallet({
        businessId: creditBusinessId,
        environment: businessScope.environment,
        currency,
        provider,
        source: TransactionSource.POS_COLLECTION,
        amount: dto.amount,
        reference: ourRef,
        merchantReference: reference,
        sourceId: posTransaction.posTransactionId,
        metadata: { raw: result.raw },
      });
    } else {
      await this.transactionService.createTransaction({
        businessId: creditBusinessId,
        environment: businessScope.environment,
        expectedAmount: dto.amount,
        settledAmount: '0',
        currency,
        provider,
        source: TransactionSource.POS_COLLECTION,
        reference,
        sourceId: posTransaction.posTransactionId,
        direction: LedgerEntryDirection.CREDIT,
        executionStatus: TransactionStatus.FAILED,
        remark: result.status,
        idempotencyKey: `pos:${creditBusinessId}:${reference}`,
        metadata: { raw: result.raw },
      });
    }

    await this.walletService.dispatchCreditWebhook(
      {
        businessId: creditBusinessId,
        environment: businessScope.environment,
        currency,
        provider,
        source: TransactionSource.POS_COLLECTION,
        amount: dto.amount,
        reference,
        sourceId: posTransaction.posTransactionId,
      },
      {
        reference,
        currency,
        amount: dto.amount,
        status: executionStatus,
        rrn,
        stan,
        cardLastFour: lastFour,
        cardBin: firstSixDigit,
        purpose: dto.purpose ?? null,
        accountOrItemId: dto.accountOrItemId ?? null,
      },
    );

    return { ...result, rrn, stan };
  }

  async incomingWebhook(body: unknown, provider: string) {
    const adapter = this.collectionAdapterFactory.getPosAdapter(provider);
    const event = adapter.parsePosWebhook(body);

    const posTransaction = await this.posTransactionsRepo.findOne({
      where: { rrn: event.rrn?.trim(), stan: event.stan?.trim() },
    });

    if (!posTransaction) {
      throw new NotFoundException('POS transaction not found');
    }

    await this.transactionService.updateTransactionBySourceId(
      posTransaction.posTransactionId,
      { providerReference: event.reference },
    );

    return event;
  }

  private resolveExecutionStatus(result: ChargePosResult): TransactionStatus {
    return result.code === SUCCESS_RESPONSE_CODE
      ? TransactionStatus.SUCCESS
      : TransactionStatus.FAILED;
  }

  private normalizeCurrency(currency?: string): string {
    const value = currency?.trim().toUpperCase();

    if (!value) {
      return 'NGN';
    }

    return CURRENCY_NAME_TO_ISO_CODE[value] ?? value;
  }
}
