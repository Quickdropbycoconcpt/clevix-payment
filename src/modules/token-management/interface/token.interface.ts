import { ActionOwner, TokenNotificationType, TokenType } from 'src/shared/enum';

export class GenerateTokenInput {
  ownerId: string;

  expiresAt?: number;

  recipientEmail: string;

  recipientPhone?: string;

  ownerType: ActionOwner;

  notificationType: TokenNotificationType;

  type: TokenType;
  // Optional caller-provided token (e.g. 4-digit code)
  token?: string;
}

export class ValidateToken {
  token: string;

  type: TokenType;

  ownerType: ActionOwner;
}
