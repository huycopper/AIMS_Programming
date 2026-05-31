import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ProductModule } from './product/product.module.js';
import { OrderModule } from './order/order.module.js';
import { join } from 'path';
import { PayThroughVietQrService } from './controllers/pay-through-viet-qr/pay-through-viet-qr.service.js';
import { VietQrService } from './boundaries/viet-qr/viet-qr.service.js';
import { VietQrWebhookController } from './boundaries/viet-qr-webhook/viet-qr-webhook.controller.js';
import { PayThroughVietQrController } from './controllers/pay-through-viet-qr/pay-through-viet-qr.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: +configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [join(process.cwd(), 'dist/**/*.entity.js')], // Tự động tìm các entity
        synchronize: true, // Auto create table
      }),
    }),
    ProductModule,
    OrderModule,
  ],
  controllers: [AppController, VietQrWebhookController, PayThroughVietQrController],
  providers: [AppService, PayThroughVietQrService, VietQrService],
})
export class AppModule { }
