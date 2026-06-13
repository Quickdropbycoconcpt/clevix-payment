import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksController } from './controller/webhook.controller';
import { WebhooksSnapshot } from './entity/webhook_snapshot.entity';
import { Webhooks } from './entity/webhook.entity';
import { WebhookService } from './service/webhook.service';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Webhooks, WebhooksSnapshot]),
  ],
  controllers: [WebhooksController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
