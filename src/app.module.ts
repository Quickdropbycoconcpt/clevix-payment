import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './infrastructure/database/database.module';
import { AuthenticationModule } from './modules/authentication/auth.module';
import { BusinessMembersModule } from './modules/business-members/business-members.module';
import { BusinessModule } from './modules/businesses/business.module';
import { CountryModule } from './modules/country-and-states/country.module';
import { PosModule } from './modules/Api/collection/pos/pos.module';
import { VirtualAccountsModule } from './modules/Api/collection/virtual-accounts/virtual-accounts.module';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { TransferModule } from './modules/Api/transfers/transfer.module';
import { ScheduleModule } from '@nestjs/schedule';
import { WebhookModule } from './modules/webhooks/webhook.module';
import { TransactionModule } from './modules/transactions/transactions.module';
import { KycModule } from './modules/kyc/kyc.module';
import { ServiceCheckoutModule } from './modules/service-checkout/service-checkout.module';
import { ServiceCheckoutInvoiceModule } from './modules/service-checkout-invoice/service-checkout-invoice.module';
import { SettlementManagementModule } from './modules/settlement-management/settlement-management.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot({}),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') ?? 'localhost',
          port: Number.parseInt(config.get<string>('REDIS_PORT') ?? '6379', 10),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
    HttpModule.register({ global: true }),
    DatabaseModule.forRoot(),
    AuthenticationModule,
    BusinessMembersModule,
    BusinessModule,
    CountryModule,
    PosModule,
    VirtualAccountsModule,
    TransferModule,
    TransactionModule,
    WebhookModule,
    KycModule,
    ServiceCheckoutModule,
    ServiceCheckoutInvoiceModule,
    SettlementManagementModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
