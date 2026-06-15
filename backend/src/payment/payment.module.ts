import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PaymentTransaction } from './entities/payment-transaction.entity.js';
import { Order } from '../order/entities/order.entity.js';
import { PayOrderBoundary } from './controllers/pay-order.controller.js';
import { PayThroughPaymentGatewayController } from './services/pay-through-payment-gateway.service.js';
import { VietQRBoundary } from '../boundaries/viet-qr/viet-qr.service.js';
import { TransactionSyncController } from '../boundaries/viet-qr/transaction-sync.controller.js';
import { NotificationModule } from '../notification/notification.module.js';
// import { VietQRController } from '../boundaries/viet-qr/viet-qr.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTransaction, Order]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
    NotificationModule,
  ],
  controllers: [PayOrderBoundary, TransactionSyncController],
  providers: [PayThroughPaymentGatewayController, VietQRBoundary],
})
export class PaymentModule { }
