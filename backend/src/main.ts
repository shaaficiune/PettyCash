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

  // Enable CORS
  app.enableCors({
    origin: '*', // For local dev. Replace with production URL before deployment
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

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Petty Cash Management System API')
    .setDescription('Enterprise Petty Cash REST API documentation for Bluekom and Somtel')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`[NestJS Server] Backend application is running on: http://10.35.70.251:${port}/api (${host})`);
  console.log(`[NestJS Server] Swagger API Documentation: http://10.35.70.251:${port}/swagger`);
}
bootstrap();
