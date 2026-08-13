import { EmailTemplateName } from 'src/infrastructure/notification/email/interface';
import { TokenType } from '../enum';

export const TOKEN_EMAIL_CONFIG: Record<
  TokenType,
  { template: EmailTemplateName; subject: string }
> = {
  [TokenType.EMAIL_VERIFICATION]: {
    template: 'email_confirmation',
    subject: 'Confirm your email address',
  },

  [TokenType.PASSWORD_RESET]: {
    template: 'password_reset',
    subject: 'Reset your password',
  },
};
