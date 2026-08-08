export type RenderedEmailTemplate = {
  subject: string;
  html: string;
};

export type WelcomeEmailContext = {
  name?: string;
  productName?: string;
  loginUrl?: string;
};

export type EmailTemplateContextMap = {
  welcome: WelcomeEmailContext;
};

export type EmailTemplateName = keyof EmailTemplateContextMap;

export type EmailTemplateDefinition<T extends EmailTemplateName> = {
  subject: string | ((context: EmailTemplateContextMap[T]) => string);
  html: string;
  layout?: string;
};
