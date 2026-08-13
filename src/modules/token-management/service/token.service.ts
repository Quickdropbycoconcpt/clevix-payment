import { BadRequestException, Injectable } from '@nestjs/common';
import {
  GenerateTokenInput,
  ValidateToken,
} from '../interface/token.interface';
import { Repository } from 'typeorm';
import { Token } from '../entity/token.entity';
import { InjectRepository } from '@nestjs/typeorm';
import Crypto from 'node:crypto';
import { User } from 'src/modules/users/entity/user.entity';
import { Businesses } from 'src/modules/businesses/entity/business.entity';
import { EmailService } from 'src/infrastructure/notification/email/email.service';
import { TokenNotificationType } from 'src/shared/enum';
import { TOKEN_EMAIL_CONFIG } from 'src/shared/constants/token_email.constants';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(Token)
    private readonly tokenRepo: Repository<Token>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Businesses)
    private readonly businessRepo: Repository<Businesses>,
    private readonly emailService: EmailService,
  ) {}

  // default expiration in minutes for generated tokens when caller doesn't provide expiresAt
  private readonly defaultExpirationMinutes = 15;

  private computeExpiresAt(provided: number): Date {
    if (typeof provided === 'number') {
      if (!Number.isFinite(provided) || provided <= 0) {
        throw new BadRequestException(
          'Expiration minutes must be a positive number',
        );
      }
      return new Date(Date.now() + Math.floor(provided) * 60_000);
    }
    return new Date(Date.now() + this.defaultExpirationMinutes * 60_000);
  }

  async generateToken(input: GenerateTokenInput) {
    const isUser = await this.userRepo.findOne({
      where: { userId: input.ownerId },
    });
    const isBusiness = await this.businessRepo.findOne({
      where: { businessId: input.ownerId },
    });
    if (!isBusiness && !isUser) {
      throw new BadRequestException(
        'OwnerId did not belong to a user or business',
      );
    }

    const hashToken = Crypto.createHash('sha256')
      .update(input.token)
      .digest('hex');

    const existing = await this.tokenRepo.findOne({
      where: {
        tokenHash: hashToken,
        ownerId: input.ownerId,
        ownerType: input.ownerType,
        type: input.type,
      },
    });

    if (existing) {
      throw new BadRequestException(`Unable to generate token at the moment`);
    }
    const tokenEntity = this.tokenRepo.create({
      ownerId: input.ownerId,
      ownerType: input.ownerType,
      notificationType: input.notificationType,
      recipientEmail: input.recipientEmail,
      recipientPhone: input.recipientPhone,
      expiresAt: this.computeExpiresAt(input.expiresAt),
      tokenHash: hashToken,
      type: input.type,
      usedAt: null,
    });
    const recipientName = isUser
      ? `${isUser.firstName} ${isUser?.lastName}`
      : (isBusiness?.businessName ?? 'Valued Customer');
    const saved = await this.tokenRepo.save(tokenEntity);
    const shouldSendEmail = [
      TokenNotificationType.EMAIL,
      TokenNotificationType.BOTH,
    ].includes(input.notificationType);
    const config = TOKEN_EMAIL_CONFIG[input.type];
    if (shouldSendEmail) {
      if (!config) {
        throw new BadRequestException(
          `No email configuration found for token type: ${input.type}`,
        );
      }
      await this.emailService.sendTemplateEmail({
        to: input.recipientEmail,
        template: config.template,
        context: {
          name: recipientName,
          productName: 'Clevix',
          token: input.token,
          link: null,
        },
        subject: config.subject ?? `Your code`,
      });
    }
    if (input.notificationType == TokenNotificationType.SMS) {
      /**Send SMS */
    }
    return { token: input.token, type: input.type, tokenId: saved.tokenId };
  }

  async ValidateToken(input: ValidateToken) {
    const hashToken = Crypto.createHash('sha256')
      .update(input.token)
      .digest('hex');

    const tokenRecord = await this.tokenRepo.findOne({
      where: {
        tokenHash: hashToken,
        type: input.type,
        ownerType: input.ownerType,
      },
    });

    if (!tokenRecord) {
      throw new BadRequestException('Invalid token');
    }

    const now = new Date();
    if (
      tokenRecord.expiresAt &&
      tokenRecord.expiresAt.getTime() < now.getTime()
    ) {
      throw new BadRequestException('Token expired');
    }

    if (tokenRecord.usedAt) {
      throw new BadRequestException('Token expired');
    }

    tokenRecord.usedAt = now;
    await this.tokenRepo.save(tokenRecord);

    return {
      ownerId: tokenRecord.ownerId,
      ownerType: tokenRecord.ownerType,
      type: tokenRecord.type,
    };
  }

  async resendByPreviousToken(previousTokenId: string) {
    if (!previousTokenId) {
      throw new BadRequestException('Previous token is required');
    }
    const existingRecord = await this.tokenRepo.findOne({
      where: { tokenId: previousTokenId },
    });

    if (!existingRecord) {
      throw new BadRequestException('Invalid or unknown token');
    }

    if (existingRecord.usedAt) {
      throw new BadRequestException(
        'Token has already been used and cannot be resent',
      );
    }

    const now = new Date();

    existingRecord.usedAt = now;
    await this.tokenRepo.save(existingRecord);

    const recipientEmail = existingRecord.recipientEmail;

    if (!recipientEmail) {
      throw new BadRequestException(
        'Unable to resolve recipient details for token',
      );
    }

    const newToken = this.generateNumericToken(6);

    const saved = await this.generateToken({
      token: newToken,
      ownerId: existingRecord.ownerId,
      ownerType: existingRecord.ownerType,
      recipientEmail,
      recipientPhone: existingRecord.recipientPhone,
      notificationType: existingRecord.notificationType,
      expiresAt: this.durationInMinutes(
        existingRecord.expiresAt,
        existingRecord.createdAt,
      ),
      type: existingRecord.type,
    });
    return { tokenId: saved.tokenId };
  }

  generateNumericToken(digits = 6): string {
    if (!Number.isInteger(digits) || digits <= 0) {
      throw new BadRequestException('digits must be a positive integer');
    }
    const min = 10 ** (digits - 1);
    const max = 10 ** digits;
    return Crypto.randomInt(min, max).toString();
  }

  durationInMinutes(date: Date, createdAt: Date): number {
    return Math.round((date.getTime() - createdAt.getTime()) / 60_000);
  }
}
