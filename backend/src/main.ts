import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // Security Headers using Helmet
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows resource sharing for images
    }),
  );

  // Secure CORS Configuration
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  const defaultOrigins = [
    'http://localhost',
    'http://localhost:80',
    'http://localhost:3000',
    'http://localhost:5173',
  ];
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map((o) => o.trim())
    : defaultOrigins;

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or same-origin server requests)
      if (!origin) return callback(null, true);
      if (
        process.env.NODE_ENV !== 'production' ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('https://localhost')
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Enable validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips non-white-listed fields
      transform: true, // Auto-transforms payloads to DTO instances
    }),
  );

  // Static files configuration to download attachments
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // Swagger Documentation Setup (only enabled in dev or when explicitly set)
  if (process.env.ENABLE_SWAGGER === 'true' || process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Petty Cash Management System API')
      .setDescription('Enterprise Petty Cash REST API documentation for Bluekom and Somtel')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('swagger', app, document);
  }

  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  const displayHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  console.log(`[NestJS Server] Backend application is running on: http://${displayHost}:${port}/api`);
  if (process.env.ENABLE_SWAGGER === 'true' || process.env.NODE_ENV !== 'production') {
    console.log(`[NestJS Server] Swagger API Documentation: http://${displayHost}:${port}/swagger`);
  }
}
bootstrap();
