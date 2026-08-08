import type { SendMailOptions } from 'nodemailer';
import {
  EmailTemplateContextMap,
  EmailTemplateName,
} from './email-template.interface';

export type EmailAddress = string | string[];

export type SendEmailInput = {
  to: EmailAddress;
  subject: string;
  html?: string;
  cc?: EmailAddress;
  bcc?: EmailAddress;
  replyTo?: string;
  from?: string;
  attachments?: SendMailOptions['attachments'];
};

export type SendEmailResult = {
  messageId?: string;
  accepted: string[];
  rejected: string[];
};

export type SendTemplateEmailInput<TemplateName extends EmailTemplateName> =
  Omit<SendEmailInput, 'subject' | 'html'> & {
    template: TemplateName;
    context: EmailTemplateContextMap[TemplateName];
    subject?: string;
  };
