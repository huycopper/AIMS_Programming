import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentTransaction } from './entities/payment-transaction.entity.js';
import { Order } from '../order/entities/order.entity.js';
import { PayOrderController } from './controllers/pay-order.controller.js';
import { PayThroughPaymentGatewayController } from './services/pay-through-payment-gateway.service.js';
import { VietQRBoundary } from '../boundaries/viet-qr/viet-qr.service.js';
import { TransactionSyncController } from '../boundaries/viet-qr/transaction-sync.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentTransaction, Order])],
  controllers: [PayOrderController, TransactionSyncController],
  providers: [PayThroughPaymentGatewayController, VietQRBoundary],
})
export class PaymentModule { }
