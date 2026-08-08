import {
  EmailTemplateDefinition,
  EmailTemplateName,
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
};
