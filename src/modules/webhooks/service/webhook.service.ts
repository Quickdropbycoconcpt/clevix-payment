import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { businessScopeFilter, BusinessScope } from 'src/shared/business-scope';
import {
  BasicStatus,
  TransactionStatus,
  WebhookAuthType,
} from 'src/shared/enum';
import { Between, EntityManager, IsNull, Repository } from 'typeorm';
import { JwtPayload } from 'src/modules/authentication/interface/jwt-payload.interface';
import { CreateWebhookDto } from '../dto/webhook.dto';
import { WebhooksSnapshot } from '../entity/webhook_snapshot.entity';
import { Webhooks } from '../entity/webhook.entity';

type ListWebhooksInput = {
  type?: string;
  status?: BasicStatus;
};

type DispatchWebhookInput = {
  businessId: string;
  environment: string;
  transactionId?: string | null;
  type: string;
  payload: Record<string, unknown>;
  attempt?: number;
  timeoutMs?: number;
};

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private retryingFailedWebhooks = false;

  constructor(
    @InjectRepository(Webhooks)
    private readonly webhookRepo: Repository<Webhooks>,
    @InjectRepository(WebhooksSnapshot)
    private readonly snapshotRepo: Repository<WebhooksSnapshot>,
    private readonly httpService: HttpService,
  ) {}

  async createWebhook(
    input: CreateWebhookDto,
    user: JwtPayload,
  ): Promise<Webhooks> {
    const scope = businessScopeFilter(user);
    const type = this.normalizeType(input.type);
    const authType = input.authType ?? WebhookAuthType.NO_AUTH;
    this.validateAuthSecret(authType, input.secret);

    const existingWebhook = await this.webhookRepo.findOne({
      where: {
        businessId: scope.businessId,
        environment: scope.environment,
        type,
        deletedAt: IsNull(),
      },
    });

    if (existingWebhook) {
      throw new ConflictException('Webhook already exists for this event type');
    }

    const webhook = this.webhookRepo.create({
      ...scope,
      type,
      url: input.url.trim(),
      authType,
      secret: authType === WebhookAuthType.NO_AUTH ? null : input.secret.trim(),
    });

    return this.webhookRepo.save(webhook);
  }

  async listWebhooks(
    user: JwtPayload,
    input: ListWebhooksInput = {},
  ): Promise<Webhooks[]> {
    const scope = businessScopeFilter(user);
    const query = this.webhookRepo
      .createQueryBuilder('webhook')
      .where('webhook.businessId = :businessId', {
        businessId: scope.businessId,
      })
      .andWhere('webhook.environment = :environment', {
        environment: scope.environment,
      })
      .andWhere('webhook.deletedAt IS NULL')
      .orderBy('webhook.createdAt', 'DESC');

    if (input.type) {
      query.andWhere('webhook.type = :type', {
        type: this.normalizeType(input.type),
      });
    }

    if (input.status) {
      query.andWhere('webhook.status = :status', { status: input.status });
    }

    return query.getMany();
  }

  async deleteWebhook(webhookId: string, user: JwtPayload): Promise<Webhooks> {
    const scope = businessScopeFilter(user);
    const webhook = await this.findScopedWebhook(webhookId, scope);

    this.webhookRepo.merge(webhook, {
      deletedAt: new Date(),
    });

    return this.webhookRepo.save(webhook);
  }

  async getWebhookSnapshots(
    webhookId: string,
    user: JwtPayload,
  ): Promise<WebhooksSnapshot[]> {
    const scope = businessScopeFilter(user);
    await this.findScopedWebhook(webhookId, scope);

    return this.snapshotRepo.find({
      where: {
        webhookId,
        businessId: scope.businessId,
        environment: scope.environment,
      },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async repushWebhook(
    user: JwtPayload,
    transactionId: string,
    webhookId?: string,
  ): Promise<{
    message: string;
    snapshot: WebhooksSnapshot;
  }> {
    const scope = businessScopeFilter(user);
    const normalizedTransactionId = transactionId?.trim();

    if (!normalizedTransactionId) {
      throw new BadRequestException('Transaction id is required');
    }

    if (webhookId) {
      await this.findScopedWebhook(webhookId, scope);
    }

    const query = this.snapshotRepo
      .createQueryBuilder('snapshot')
      .where('snapshot.businessId = :businessId', {
        businessId: scope.businessId,
      })
      .andWhere('snapshot.environment = :environment', {
        environment: scope.environment,
      })
      .andWhere('snapshot.transactionId = :transactionId', {
        transactionId: normalizedTransactionId,
      })
      .orderBy('snapshot.createdAt', 'DESC')
      .addOrderBy('snapshot.attempt', 'DESC');

    if (webhookId) {
      query.andWhere('snapshot.webhookId = :webhookId', { webhookId });
    }

    const snapshot = await query.getOne();

    if (!snapshot) {
      throw new NotFoundException('Webhook delivery not found');
    }

    const repushedSnapshot = await this.dispatchWebhook({
      businessId: scope.businessId,
      environment: scope.environment,
      transactionId: snapshot.transactionId,
      type: snapshot.type,
      payload: snapshot.payload,
      attempt: snapshot.attempt + 1,
    });

    if (!repushedSnapshot) {
      throw new NotFoundException(
        `No active webhook configured for ${snapshot.type}`,
      );
    }

    return {
      message: 'Webhook repushed',
      snapshot: repushedSnapshot,
    };
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async retryRecentFailedWebhooksCron() {
    if (this.retryingFailedWebhooks) {
      return;
    }

    this.retryingFailedWebhooks = true;

    try {
      const retryCount = await this.retryFailedWebhooksWithinLast24Hours();

      if (retryCount > 0) {
        this.logger.log(`Retried ${retryCount} failed webhook deliveries`);
      }
    } catch (error) {
      this.logger.error(
        'Failed to retry failed webhook deliveries',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.retryingFailedWebhooks = false;
    }
  }

  async retryFailedWebhooksWithinLast24Hours(batchSize = 100): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const failedSnapshots = await this.snapshotRepo.find({
      where: {
        deliveryStatus: 'FAILED',
        createdAt: Between(new Date(), cutoff),
      },
    });

    let retryCount = 0;

    for (const snapshot of failedSnapshots) {
      try {
        const retrySnapshot = await this.dispatchWebhook({
          businessId: snapshot.businessId,
          environment: snapshot.environment,
          transactionId: snapshot.transactionId,
          type: snapshot.type,
          payload: snapshot.payload,
          attempt: Number(snapshot.attempt ?? 1) + 1,
        });

        if (retrySnapshot) {
          retryCount += 1;
        }
      } catch (error) {
        this.logger.error(
          `Failed to retry webhook delivery for transactionId=${snapshot.transactionId}, webhookId=${snapshot.webhookId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return retryCount;
  }

  async simulateVirtualCollectionWebhookToMerchant(
    user: JwtPayload,
    type?: string,
  ): Promise<{
    message: string;
    snapshot: WebhooksSnapshot;
  }> {
    const scope = businessScopeFilter(user);
    const webhookType = this.normalizeType(type);
    const transactionId = randomUUID();
    const snapshot = await this.dispatchWebhook({
      businessId: scope.businessId,
      environment: scope.environment,
      transactionId,
      type: webhookType,
      payload: this.getVirtualCollectionTestPayload(),
    });

    if (!snapshot) {
      throw new NotFoundException(
        `No active webhook configured for ${webhookType}`,
      );
    }

    return {
      message: 'Test webhook sent',
      snapshot,
    };
  }

  async dispatchWebhook(
    input: DispatchWebhookInput,
    entityManager?: EntityManager,
  ): Promise<WebhooksSnapshot | null> {
    const webhookRepository =
      entityManager?.getRepository(Webhooks) ?? this.webhookRepo;
    const snapshotRepository =
      entityManager?.getRepository(WebhooksSnapshot) ?? this.snapshotRepo;
    const type = this.normalizeType(input.type);
    const webhook = await webhookRepository.findOne({
      where: {
        businessId: input.businessId,
        environment: input.environment,
        type,
        deletedAt: IsNull(),
      },
    });

    if (!webhook) {
      this.logger.warn(
        `No active webhook found for businessId=${input.businessId}, environment=${input.environment}, type=${type}`,
      );
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(webhook.url, input.payload, {
          headers: this.getWebhookHeaders(webhook),
          timeout: input.timeoutMs ?? 10000,
          validateStatus: () => true,
        }),
      );
      const deliveryStatus =
        response.status >= 200 && response.status < 300 ? 'SUCCESS' : 'FAILED';

      return snapshotRepository.save(
        snapshotRepository.create({
          webhookId: webhook.webhookId,
          businessId: webhook.businessId,
          environment: webhook.environment,
          transactionId: input.transactionId ?? null,
          type,
          payload: input.payload,
          responseStatus: response.status,
          responseBody: this.toJsonObject(response.data),
          errorMessage: null,
          deliveryStatus,
          attempt: input.attempt ?? 1,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to dispatch webhookId=${webhook.webhookId}, businessId=${webhook.businessId}, type=${type}`,
        error instanceof Error ? error.stack : String(error),
      );

      return snapshotRepository.save(
        snapshotRepository.create({
          webhookId: webhook.webhookId,
          businessId: webhook.businessId,
          environment: webhook.environment,
          transactionId: input.transactionId ?? null,
          type,
          payload: input.payload,
          responseStatus: null,
          responseBody: null,
          errorMessage: error instanceof Error ? error.message : String(error),
          deliveryStatus: 'FAILED',
          attempt: input.attempt ?? 1,
        }),
      );
    }
  }

  private async findScopedWebhook(
    webhookId: string,
    scope: BusinessScope,
  ): Promise<Webhooks> {
    const webhook = await this.webhookRepo.findOne({
      where: {
        webhookId,
        businessId: scope.businessId,
        environment: scope.environment,
        deletedAt: IsNull(),
      },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return webhook;
  }

  private normalizeType(type?: string): string {
    const normalizedType = type?.trim().toUpperCase();

    if (!normalizedType) {
      throw new BadRequestException('Webhook type is required');
    }

    return normalizedType;
  }

  private getVirtualCollectionTestPayload(): Record<string, unknown> {
    const reference = `test_va_${Date.now()}`;
    return {
      reference,
      currency: 'NGN',
      amount: '99700',
      status: TransactionStatus.SUCCESS,
      senderAccountNumber: '0000000000',
      senderName: 'Clevix Test Sender',
      receivedAccountNumber: '9999999999',
      narration: 'Clevix virtual account webhook test',
      sessionId: `test_session_${Date.now()}`,
    };
  }

  private validateAuthSecret(
    authType: WebhookAuthType,
    secret?: string | null,
  ) {
    if (authType !== WebhookAuthType.NO_AUTH && !secret?.trim()) {
      throw new BadRequestException('Webhook secret is required');
    }
  }

  private getWebhookHeaders(webhook: Webhooks): Record<string, string> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-clevix-signature': webhook.type,
    };

    if (webhook.authType === WebhookAuthType.API_KEY && webhook.secret) {
      headers['x-api-key'] = webhook.secret;
    }

    if (webhook.authType === WebhookAuthType.BEARER_TOKEN && webhook.secret) {
      headers.authorization = `Bearer ${webhook.secret}`;
    }

    return headers;
  }

  private toJsonObject(value: unknown): Record<string, unknown> | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return { value };
  }
}
