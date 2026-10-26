import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  app.enableShutdownHooks();

  app.use(compression());

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hidePoweredBy: true,
    xssFilter: true,
    noSniff: true,
    frameguard: { action: 'sameorigin' },
  }));

  const isProduction = configService.get('NODE_ENV') === 'production';
  const allowedOrigins = [
    configService.get('FRONTEND_URL'),
    'https://myfair.webbea.qa',
    'http://myfair.webbea.qa',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        (typeof origin === 'string' && (origin.endsWith('.webbea.qa') || origin.includes('webbea.qa') || origin.includes('localhost')))
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'x-api-key',
      'X-Tenant-ID',
      'x-tenant-id',
      'X-Branch-ID',
      'x-branch-id',
      'X-Requested-With',
    ],
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Security: Only expose Swagger docs in development or when explicitly enabled
  const enableSwagger = !isProduction || configService.get('ENABLE_SWAGGER') === 'true';
  if (enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Inventory SaaS API')
      .setDescription('Multi-Tenant Inventory Management System API')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get('PORT', 3001);
  await app.listen(port);
  console.log(`[InventoryOS] Backend running on: http://localhost:${port}`);
  if (enableSwagger) {
    console.log(`[InventoryOS] Swagger docs enabled at: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
