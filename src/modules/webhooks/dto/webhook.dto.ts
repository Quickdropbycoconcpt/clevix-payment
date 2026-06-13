import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { BasicStatus, WebhookAuthType } from 'src/shared/enum';

export class CreateWebhookDto {
  @ApiProperty({ example: 'https://merchant.example.com/webhooks/clevix' })
  @IsUrl({ require_protocol: true })
  url: string;

  @ApiProperty({ example: 'VIRTUAL_ACCOUNT_COLLECTION' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({
    enum: WebhookAuthType,
    default: WebhookAuthType.NO_AUTH,
  })
  @IsOptional()
  @IsEnum(WebhookAuthType)
  authType?: WebhookAuthType;

  @ApiPropertyOptional({ example: 'merchant-webhook-token' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  secret?: string;
}

export class UpdateWebhookDto {
  @ApiPropertyOptional({ example: 'https://merchant.example.com/webhooks/new' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;

  @ApiPropertyOptional({ example: 'TRANSFER' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  type?: string;

  @ApiPropertyOptional({ enum: WebhookAuthType })
  @IsOptional()
  @IsEnum(WebhookAuthType)
  authType?: WebhookAuthType;

  @ApiPropertyOptional({ example: 'merchant-webhook-token' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  secret?: string;

  @ApiPropertyOptional({ enum: BasicStatus })
  @IsOptional()
  @IsEnum(BasicStatus)
  status?: BasicStatus;
}
