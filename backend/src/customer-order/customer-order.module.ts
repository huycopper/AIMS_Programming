import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../order/entities/order.entity.js';
import { PaymentTransaction } from '../payment/entities/payment-transaction.entity.js';
import { CustomerOrderService } from './customer-order.service.js';
import { CustomerOrderController } from './customer-order.controller.js';
import { RefundModule } from '../refund/refund.module.js';
import { OrderModule } from '../order/order.module.js';
import { CustomerOrderNotificationModule } from './notification/customer-order-notification.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, PaymentTransaction]),
    RefundModule,
    CustomerOrderNotificationModule,
    OrderModule,
  ],
  controllers: [CustomerOrderController],
  providers: [CustomerOrderService],
})
export class CustomerOrderModule {}
