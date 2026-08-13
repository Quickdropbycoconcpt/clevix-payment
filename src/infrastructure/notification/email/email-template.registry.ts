import {
  EmailTemplateDefinition,
  EmailTemplateName,
  OtpContext,
  WelcomeEmailContext,
} from './interface/email-template.interface';

export const emailTemplateRegistry: {
  [TemplateName in EmailTemplateName]: EmailTemplateDefinition<TemplateName>;
} = {
  welcome: {
    subject: (context: WelcomeEmailContext) =>
      `Welcome to ${context.productName?.trim() || 'Clevix'}`,
    html: 'welcome/html.hbs',
    layout: 'layouts/base.hbs',
  },
  password_reset: {
    subject: 'Reset your password',
    html: 'password_reset/html.hbs',
    layout: 'layouts/base.hbs',
  },
  email_confirmation: {
    subject: (context: OtpContext) =>
      `'Confirm your email address ${context.token}`,
    html: 'email_confirmation/html.hbs',
    layout: 'layouts/base.hbs',
  },
};
