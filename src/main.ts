import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global Class Serializer (to exclude password etc.)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // CORS for Next.js Frontend
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Aristo Store API')
    .setDescription('Full REST API for E-Commerce Platform (NestJS, TypeORM, PostgreSQL)')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication & User Registration endpoints')
    .addTag('Users', 'User management & profile endpoints')
    .addTag('Categories', 'Category CRUD endpoints')
    .addTag('Products', 'Product catalog, search, filter & management endpoints')
    .addTag('Cart', 'Shopping cart management endpoints')
    .addTag('Addresses', 'User shipping addresses endpoints')
    .addTag('Orders', 'Checkout and Order management endpoints')
    .addTag('Admin Dashboard', 'Admin analytics and overview endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
