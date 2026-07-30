import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { CardTransactions } from './entity/card-transactions.entity';
import { CardCardPaymentsController } from './controller/card-payment.controller';
import { CardPaymentService } from './service/card-payment.service';
import { CollectionAdapterFactory } from '../adapters/collection.adapter.factory';
import { VfdModule } from 'src/infrastructure/payments/providers/vfd/vfd.module';
import { TransactionModule } from 'src/modules/transactions/transactions.module';
import { CardPaymentWebhookQueue } from './jobs/card-payment-webhook.queue';
import { CardPaymentWebhookProcessor } from './jobs/card-payment-webhook.processor';
import { CARD_PAYMENT_WEBHOOK_QUEUE } from './jobs/card-payment-webhook.job';
import { WalletModule } from 'src/modules/wallets/wallets.module';
import { ReconciliationModule } from 'src/modules/reconciliation/reconciliation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CardTransactions]),
    BullModule.registerQueue({
      name: CARD_PAYMENT_WEBHOOK_QUEUE,
    }),
    VfdModule,
    TransactionModule,
    WalletModule,
    ReconciliationModule,
  ],
  controllers: [CardCardPaymentsController],
  providers: [
    CardPaymentService,
    CollectionAdapterFactory,
    CardPaymentWebhookQueue,
    CardPaymentWebhookProcessor,
  ],
  exports: [CardPaymentService],
})
export class CardPaymentModule {}
