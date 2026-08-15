import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  EmailAddress,
  EmailTemplateName,
  SendEmailInput,
  SendEmailResult,
  SendTemplateEmailInput,
} from './interface';
import { EmailTemplateService } from './email-template.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter?: Transporter;

  constructor(
    private readonly config: ConfigService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly httpService: HttpService,
  ) {}

  async getEmailTransporter(input: SendEmailInput): Promise<SendEmailResult> {
    this.validateEmailInput(input);
    try {
      const useSmtp = process.env.USE_SMTP;
      if (useSmtp) {
        const result = await this.getTransporter().sendMail({
          from: input.from ?? this.getDefaultSender(),
          to: input.to,
          cc: input.cc,
          bcc: input.bcc,
          replyTo: input.replyTo,
          subject: input.subject.trim(),
          html: input.html,
          attachments: input.attachments,
        });

        return {
          messageId: result.messageId,
          accepted: this.normalizeAddressResult(result.accepted),
          rejected: this.normalizeAddressResult(result.rejected),
        };
      } else {
        // Use ZeptoMail API via project's HttpService
        const apiKey =
          this.config.get<string>('ZEPTOMAIL_API_KEY') ??
          process.env.ZEPTOMAIL_API_KEY;

        if (!apiKey) {
          throw new InternalServerErrorException(
            'No SMTP configured and ZEPTOMAIL_API_KEY is not set',
          );
        }

        const toList = Array.isArray(input.to) ? input.to : [input.to];
        const toPayload = toList
          .map((t) => this.normalizeAddress(t))
          .filter(Boolean)
          .map((address) => ({ email_address: { address } }));

        if (!toPayload.length) {
          throw new BadRequestException('Email recipient is required');
        }

        const fromRaw = input.from ?? this.getDefaultSender();
        const extractEmail = (s: string) => {
          const m = s.match(/<([^>]+)>/);
          return m ? m[1] : s;
        };

        const fromAddress = extractEmail(
          this.normalizeAddress(fromRaw) ?? fromRaw,
        );

        const payload = {
          from: { address: fromAddress },
          to: toPayload,
          subject: input.subject.trim(),
          htmlbody: input.html,
        };

        const url =
          this.config.get<string>('ZEPTOMAIL_API_URL') ??
          process.env.ZEPTOMAIL_API_URL ??
          'https://api.zeptomail.com/v1.1/email';

        const headers = {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `${apiKey}`,
        };

        const response = await firstValueFrom(
          this.httpService.post(url, payload, { headers }),
        );

        if (!response || response.status >= 400) {
          this.logger.error(
            'ZeptoMail send failed',
            response?.data ?? response?.statusText,
          );
          throw new InternalServerErrorException(
            'Unable to send email via ZeptoMail',
          );
        }

        const accepted = toList
          .map((t) => this.normalizeAddress(t))
          .filter(Boolean) as string[];

        return {
          messageId: response.headers?.['x-message-id'] ?? '',
          accepted,
          rejected: [],
        };
      }
    } catch (error: any) {
      this.logger.error(error);
      this.logger.error(
        `Unable to send email: ${error?.message ?? 'unknown error'}`,
      );
      throw new InternalServerErrorException('Unable to send email', {
        cause: error,
      });
    }
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    return this.getEmailTransporter(input);
  }

  async sendTemplateEmail<TemplateName extends EmailTemplateName>(
    input: SendTemplateEmailInput<TemplateName>,
  ): Promise<SendEmailResult> {
    const template = this.emailTemplateService.render(
      input.template,
      input.context,
    );
    return this.sendEmail({
      ...input,
      subject: input.subject ?? template.subject,
      html: template.html,
    });
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.requiredConfig('SMTP_HOST'),
        port: Number.parseInt(
          this.config.get<string>('SMTP_PORT') ?? '587',
          10,
        ),
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: {
          user: this.requiredConfig('SMTP_USER'),
          pass: this.requiredConfig('SMTP_PASSWORD'),
        },
      });
    }

    return this.transporter;
  }

  private getDefaultSender(): string {
    const fromEmail = this.requiredConfig('SMTP_FROM_EMAIL');
    const fromName = this.config.get<string>('SMTP_FROM_NAME')?.trim();

    return fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;
  }

  private validateEmailInput(input: SendEmailInput) {
    if (!input.to || this.addressesAreEmpty(input.to)) {
      throw new BadRequestException('Email recipient is required');
    }

    if (!input.subject?.trim()) {
      throw new BadRequestException('Email subject is required');
    }

    if (!input.html?.trim()) {
      throw new BadRequestException('Email html body is required');
    }
  }

  private requiredConfig(key: string): string {
    const value = this.config.get<string>(key)?.trim();

    if (!value) {
      throw new InternalServerErrorException(`${key} is not configured`);
    }

    return value;
  }

  private addressesAreEmpty(addresses: EmailAddress): boolean {
    return Array.isArray(addresses)
      ? addresses.every((address) => !address?.trim())
      : !addresses.trim();
  }

  private normalizeAddressResult(addresses: unknown): string[] {
    if (!addresses) {
      return [];
    }

    if (Array.isArray(addresses)) {
      return addresses
        .map((address) => this.normalizeAddress(address))
        .filter((address): address is string => Boolean(address));
    }

    const address = this.normalizeAddress(addresses);

    return address ? [address] : [];
  }

  private normalizeAddress(address: unknown): string | null {
    if (typeof address === 'string') {
      return address;
    }

    if (address && typeof address === 'object' && 'address' in address) {
      const emailAddress = (address as { address?: unknown }).address;

      return typeof emailAddress === 'string' ? emailAddress : null;
    }

    return null;
  }
}
