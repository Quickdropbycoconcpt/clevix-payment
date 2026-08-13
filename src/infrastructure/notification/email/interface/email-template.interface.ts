export type RenderedEmailTemplate = {
  subject: string;
  html: string;
};

export type WelcomeEmailContext = {
  name?: string;
  productName?: string;
  loginUrl?: string;
};

export type OtpContext = {
  token: string;
  name?: string;
  link?: string;
  productName?: string;
};

export type EmailConfirmationContext = {
  name?: string;
  productName?: string;
  token?: string;
  link?: string | null;
};

export type PasswordResetContext = {
  name?: string;
  productName?: string;
  token?: string;
  link?: string | null;
};

export type EmailTemplateContextMap = {
  welcome: WelcomeEmailContext;
  email_confirmation: OtpContext;
  password_reset: OtpContext;
};

export type EmailTemplateName = keyof EmailTemplateContextMap;

export type EmailTemplateDefinition<T extends EmailTemplateName> = {
  subject: string | ((context: EmailTemplateContextMap[T]) => string);
  html: string;
  layout?: string;
};
