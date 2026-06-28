import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaceOrderController } from './order.controller.js';
import { OrderFulfillmentController } from './order-fulfillment.controller.js';
import { OrderService } from './order.service.js';
import { OrderFulfillmentService } from './order-fulfillment.service.js';
import { Order, OrderItem, DeliveryInfo } from './entities/order.entity.js';
import { PaymentTransaction } from '../payment/entities/payment-transaction.entity.js';
import { Product } from '../product/entities/product.entity.js';
import { RefundModule } from '../refund/refund.module.js';
import { PayOrderNotificationModule } from '../pay-order/notification/pay-order-notification.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { OrderFulfillmentNotificationControl } from './notification/order-fulfillment-notification.control.js';
import { ProductModule } from '../product/product.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      DeliveryInfo,
      PaymentTransaction,
      Product,
    ]),
    AuthModule,
    RefundModule,
    PayOrderNotificationModule,
    ProductModule,
  ],
  controllers: [PlaceOrderController, OrderFulfillmentController],
  providers: [
    OrderService,
    OrderFulfillmentService,
    OrderFulfillmentNotificationControl,
  ],
  exports: [OrderService],
})
export class OrderModule {}
