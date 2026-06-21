import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PayOrderNotificationModule } from '../../pay-order/notification/pay-order-notification.module.js';
import { OrderCancelledEmailTemplateControl } from './control/order-cancelled-email-template.control.js';
import { OrderCancelledNotificationControl } from './control/order-cancelled-notification.control.js';

@Module({
  imports: [ConfigModule, PayOrderNotificationModule],
  providers: [
    OrderCancelledEmailTemplateControl,
    OrderCancelledNotificationControl,
  ],
  exports: [OrderCancelledNotificationControl],
})
export class CustomerOrderNotificationModule {}
