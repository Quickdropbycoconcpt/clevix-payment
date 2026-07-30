import { BadRequestException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import {
  CardAuthType,
  CardTransactions,
} from '../entity/card-transactions.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CollectionProvider } from '../../adapters/contracts/collection-adapter.types';
import { CollectionAdapterFactory } from '../../adapters/collection.adapter.factory';
import { RequestScope } from 'src/shared/business-scope';
import { CardPaymentDto, ValidateCardOtpDto } from '../dto/card.dto';
import { TransactionService } from 'src/modules/transactions/service/transaction.service';
import {
  LedgerEntryDirection,
  TransactionSource,
  TransactionStatus,
} from 'src/shared/enum';
import * as Crypto from 'node:crypto';
import { CardPaymentWebhookQueue } from '../jobs/card-payment-webhook.queue';

type InitiateCardPaymentInput = CardPaymentDto & {
  feeCharged?: string;
};

@Injectable()
export class CardPaymentService {
  constructor(
    @InjectRepository(CardTransactions)
    private readonly cardTransactionRepo: Repository<CardTransactions>,
    private readonly collectionAdapterFactory: CollectionAdapterFactory,
    private readonly txnService: TransactionService,
    private readonly cardPaymentWebhookQueue: CardPaymentWebhookQueue,
  ) {}

  async initiateCardPayment(
    input: InitiateCardPaymentInput,
    scope: RequestScope,
  ) {
    const provider = CollectionProvider.VFD;
    const ourRef = `CLV-${Crypto.randomUUID()}`;
    const txn = await this.cardTransactionRepo.findOne({
      where: { reference: input.reference.trim() },
    });
    if (txn) {
      if (txn.status === TransactionStatus.SUCCESS) {
        throw new BadRequestException('Reference already exists');
      }

      return { ...txn };
    }

    const adapter =
      this.collectionAdapterFactory.getCardPaymentAdapter(provider);
    await this.cardTransactionRepo.manager.transaction(
      async (entityManager) => {
        const cardTxn = entityManager.create(CardTransactions, {
          amount: input.amount,
          feeCharged: input.feeCharged,
          reference: ourRef,
          businessId: scope.businessId,
          environment: scope.environment,
        });
        const txn = await entityManager.save(cardTxn);
        await this.txnService.createTransaction(
          {
            expectedAmount: input.amount,
            settledAmount: '0',
            businessId: scope.businessId,
            reference: ourRef,
            provider,
            currency: 'NGN',
            source: TransactionSource.DEBIT_CARD_COLLECTION,
            environment: scope.environment,
            direction: LedgerEntryDirection.CREDIT,
            executionStatus: TransactionStatus.INITIATED,
            sourceId: txn.cardTransactionId,
            merchantReference: input.reference,
            providerReference: ourRef,
            idempotencyKey: `debit-card:${scope.businessId}:${input.reference}`,
            remark: 'Debit card collection initiated',
            metadata: {},
          },
          entityManager,
        );
      },
    );
    const res = await adapter.initiateTransaction({
      environment: scope.environment,
      pin: input.cardPin,
      cvv2: input.cvv2,
      cardNumber: input.cardNumber,
      expiryDate: input.expiryDate,
      amount: input.amount,
      reference: ourRef,
      customerId: input.email,
    });
    if (res.requiredOtp) {
      await this.cardTransactionRepo.update(
        { reference: input.reference },
        { authorizationType: CardAuthType.OTP_VALIDATE },
      );
    } else {
      await this.cardTransactionRepo.update(
        { reference: ourRef },
        { authorizationType: CardAuthType.REDIRECT_URL },
      );
    }

    return res;
  }

  async validateCardOtp(input: ValidateCardOtpDto, scope: RequestScope) {
    const provider = CollectionProvider.VFD;
    const adapter =
      this.collectionAdapterFactory.getCardPaymentAdapter(provider);

    if (!adapter.validateOtp) {
      throw new BadRequestException(
        `${provider} does not support card OTP validation`,
      );
    }

    return await adapter.validateOtp({
      environment: scope.environment,
      otp: input.otp?.trim(),
      reference: `${input.reference?.trim()}`,
    });
  }

  async incomingWebhook(provider: string, body: any) {
    const adapter =
      this.collectionAdapterFactory.getCardPaymentAdapter(provider);
    const event = adapter.incomingWebhookHandler(body);

    if (!event?.reference || !event?.providerReference) {
      throw new BadRequestException('Invalid card webhook payload');
    }

    await this.cardPaymentWebhookQueue.addWebhookJob({
      provider,
      webhook: event,
      raw: body,
    });

    return event;
  }
}
