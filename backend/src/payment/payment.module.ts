import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentTransaction } from './entities/payment-transaction.entity.js';
import { Order } from '../order/entities/order.entity.js';
import { PayOrderController } from './controllers/pay-order.controller.js';
import { PayThroughPaymentGatewayController } from './services/pay-through-payment-gateway.service.js';
import { VietQRBoundary } from '../boundaries/viet-qr/viet-qr.service.js';
import { VietQRWebhookBoundary } from '../boundaries/viet-qr/viet-qr-webhook.boundary.js';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentTransaction, Order])],
  controllers: [PayOrderController, VietQRWebhookBoundary],
  providers: [PayThroughPaymentGatewayController, VietQRBoundary],
})
export class PaymentModule {}
