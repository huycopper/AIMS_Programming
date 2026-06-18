import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PaymentTransaction } from './entities/payment-transaction.entity.js';
import { Order } from '../order/entities/order.entity.js';
import { PayOrderController } from '../pay-order/pay-by-vietqr/boundary/http/pay-order.controller.js';
import { PayThroughVietQRController } from '../pay-order/pay-by-vietqr/control/pay-through-vietqr.controller.js';
import { VietQRBoundary } from '../pay-order/pay-by-vietqr/boundary/gateway/vietqr.boundary.js';
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
  controllers: [PayOrderController, TransactionSyncController],
  providers: [PayThroughVietQRController, VietQRBoundary],
})
export class PaymentModule { }
