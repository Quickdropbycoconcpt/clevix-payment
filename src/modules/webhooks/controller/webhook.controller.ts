import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BusinessDashboardAuth } from 'src/modules/authentication/decorators/business-dashboard-auth.decorator';
import { CurrentUser } from 'src/modules/authentication/decorators/current-user.decorator';
import { PermissionGranted } from 'src/modules/authentication/guards/access-control-guard';
import type { JwtPayload } from 'src/modules/authentication/interface/jwt-payload.interface';
import { PermissionsEnum } from 'src/modules/business-members/enums/business-member.enums';
import { BasicStatus } from 'src/shared/enum';
import { CreateWebhookDto } from '../dto/webhook.dto';
import { WebhookService } from '../service/webhook.service';

@ApiTags('Dashboard Webhook Management')
@ApiBearerAuth('bearer')
@Controller('webhooks')
@BusinessDashboardAuth()
export class WebhooksController {
  constructor(private readonly webhookService: WebhookService) {}

  @PermissionGranted(PermissionsEnum.WEBHOOK_CREATE)
  @Post()
  async createWebhook(
    @Body() dto: CreateWebhookDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.webhookService.createWebhook(dto, user);
  }

  @PermissionGranted(PermissionsEnum.WEBHOOK_VIEW)
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false, enum: BasicStatus })
  @Get()
  async listWebhooks(
    @CurrentUser() user: JwtPayload,
    @Query('type') type?: string,
    @Query('status') status?: BasicStatus,
  ) {
    return this.webhookService.listWebhooks(user, { type, status });
  }

  @PermissionGranted(PermissionsEnum.WEBHOOK_UPDATE)
  @Post('simulate/:type')
  async simulateWebhookByParam(
    @CurrentUser() user: JwtPayload,
    @Param('type') type: string,
  ) {
    return this.webhookService.simulateVirtualCollectionWebhookToMerchant(
      user,
      type,
    );
  }

  @PermissionGranted(PermissionsEnum.WEBHOOK_UPDATE)
  @ApiQuery({ name: 'transactionId', required: true })
  @Post('repush')
  async repushWebhookByTransaction(
    @CurrentUser() user: JwtPayload,
    @Query('transactionId') transactionId: string,
  ) {
    return this.webhookService.repushWebhook(user, transactionId);
  }

  @PermissionGranted(PermissionsEnum.WEBHOOK_DELETE)
  @Delete(':webhookId')
  async deleteWebhook(
    @Param('webhookId') webhookId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.webhookService.deleteWebhook(webhookId, user);
  }
}
