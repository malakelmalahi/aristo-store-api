import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    // 1. تحميل ملف .env وجعله متاحاً في التطبيق بالكامل
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. إعداد الاتصال بـ PostgreSQL باستخدام TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        entities: [],
        synchronize: true, // بيعمل sync للهيكل تلقائياً في بيئة التطوير
      }),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }