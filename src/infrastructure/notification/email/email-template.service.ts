import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as Handlebars from 'handlebars';
import { emailTemplateRegistry } from './email-template.registry';
import {
  EmailTemplateContextMap,
  EmailTemplateName,
  RenderedEmailTemplate,
} from './interface/email-template.interface';

@Injectable()
export class EmailTemplateService {
  private readonly templatesRoot = join(__dirname, 'views');
  private readonly compiledTemplates = new Map<
    string,
    Handlebars.TemplateDelegate
  >();

  render<TemplateName extends EmailTemplateName>(
    template: TemplateName,
    context: EmailTemplateContextMap[TemplateName],
  ): RenderedEmailTemplate {
    const templateDefinition = emailTemplateRegistry[template];

    if (!templateDefinition) {
      throw new BadRequestException(`Unknown email template: ${template}`);
    }

    const subject = this.renderSubject(templateDefinition.subject, context);
    const viewContext = {
      ...context,
      productName: this.resolveProductName(context),
      subject,
      currentYear: new Date().getFullYear(),
    };

    const content = this.renderTemplateFile(
      templateDefinition.html,
      viewContext,
    );
    const html = templateDefinition.layout
      ? this.renderTemplateFile(templateDefinition.layout, {
          ...viewContext,
          body: content,
        })
      : content;

    return { subject, html };
  }

  private renderSubject<TemplateName extends EmailTemplateName>(
    subject:
      | string
      | ((context: EmailTemplateContextMap[TemplateName]) => string),
    context: EmailTemplateContextMap[TemplateName],
  ): string {
    return typeof subject === 'function' ? subject(context) : subject;
  }

  private renderTemplateFile(
    templatePath: string,
    context: Record<string, unknown>,
  ): string {
    const compiledTemplate = this.getCompiledTemplate(templatePath);

    return compiledTemplate(context);
  }

  private getCompiledTemplate(
    templatePath: string,
  ): Handlebars.TemplateDelegate {
    const cachedTemplate = this.compiledTemplates.get(templatePath);

    if (cachedTemplate) {
      return cachedTemplate;
    }

    const absoluteTemplatePath = join(this.templatesRoot, templatePath);

    if (!existsSync(absoluteTemplatePath)) {
      throw new InternalServerErrorException(
        `Email template not found: ${templatePath}`,
      );
    }

    const templateSource = readFileSync(absoluteTemplatePath, 'utf8');
    const compiledTemplate = Handlebars.compile(templateSource);
    this.compiledTemplates.set(templatePath, compiledTemplate);

    return compiledTemplate;
  }

  private resolveProductName(context: Record<string, unknown>): string {
    return typeof context.productName === 'string' && context.productName.trim()
      ? context.productName.trim()
      : 'Clevix';
  }
}
