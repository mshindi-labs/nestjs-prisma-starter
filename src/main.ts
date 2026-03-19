import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ApiKeyGuard } from './auth/guards/api-key.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import morgan from 'morgan';
import helmet from 'helmet';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import {
  ConsoleLogger,
  Logger,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      prefix: 'MTL-API',
      json: false,
    }),
  });

  // middlewares
  app.enableCors();
  app.use(morgan('dev'));
  app.use(helmet());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const logger = new Logger('BOOTSTRAP');

  const config = new DocumentBuilder()
    .setTitle('Mtoto-Learn-API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token', // this name will be used in @ApiBearerAuth('access-token')
    )
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, documentFactory, {
    jsonDocumentUrl: 'api-docs/json',
  });

  // Global authentication guards (order matters: API key guard runs first)
  const reflector = app.get(Reflector);
  app.useGlobalGuards(
    new ApiKeyGuard(reflector),
    new JwtAuthGuard(reflector),
    new RolesGuard(reflector),
  );

  await app.listen(process.env.PORT ?? 8000);

  logger.log(`Server is running on port ${await app.getUrl()}`);
}
void bootstrap();
