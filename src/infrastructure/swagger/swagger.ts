import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const normalizePath = (path: string | undefined): string => {
  const value = path?.trim() || 'docs';

  return value.replace(/^\/+/, '');
};

export const setupSwagger = (app: INestApplication): void => {
  if (process.env.SWAGGER_ENABLED === 'false') {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Clevix Payments API')
    .setDescription('API documentation for the Clevix payment infrastructure.')
    .setVersion(process.env.npm_package_version ?? '1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(normalizePath(process.env.SWAGGER_PATH), app, document, {
    customSiteTitle: 'Clevix Payments API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
};
