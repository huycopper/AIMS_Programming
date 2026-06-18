import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PaymentTransaction } from '../../payment/entities/payment-transaction.entity.js';
import { Order } from '../../order/entities/order.entity.js';
import { PayOrderController } from './boundary/http/pay-order.controller.js';
import { VietQrTokenBoundary } from './boundary/webhook/vietqr-token.boundary.js';
import { VietQrTransactionSyncBoundary } from './boundary/webhook/vietqr-transaction-sync.boundary.js';
import { PayThroughVietQRController } from './control/pay-through-vietqr.controller.js';
import { VietQRBoundary } from './boundary/gateway/vietqr.boundary.js';
import { VietQrTransactionSyncControl } from './control/vietqr-transaction-sync.control.js';
import { VietQrCallbackValidatorControl } from './control/vietqr-callback-validator.control.js';
import { VietQrOrderMatcherControl } from './control/vietqr-order-matcher.control.js';
import { VietQrPaymentTransactionFactory } from './control/vietqr-payment-transaction-factory.js';
import { NotificationModule } from '../../notification/notification.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTransaction, Order]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
    NotificationModule,
  ],
  controllers: [
    PayOrderController,
    VietQrTokenBoundary,
    VietQrTransactionSyncBoundary,
  ],
  providers: [
    PayThroughVietQRController,
    VietQRBoundary,
    VietQrTransactionSyncControl,
    VietQrCallbackValidatorControl,
    VietQrOrderMatcherControl,
    VietQrPaymentTransactionFactory,
  ],
  exports: [
    PayThroughVietQRController,
    VietQRBoundary,
    VietQrTransactionSyncControl,
    VietQrCallbackValidatorControl,
    VietQrOrderMatcherControl,
    VietQrPaymentTransactionFactory,
  ],
})
export class PayByVietQrModule {}
