import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { EmailTemplateService } from './email/email-template.service';
import { EmailService } from './email/email.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [EmailService, EmailTemplateService],
  exports: [EmailService, EmailTemplateService],
})
export class NotificationModule {}
