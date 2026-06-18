import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email/email.service.js';
import { NotificationService } from './notification.service.js';
import { PayOrderNotificationModule } from '../pay-order/notification/pay-order-notification.module.js';

@Module({
  imports: [ConfigModule, PayOrderNotificationModule],
  providers: [
    EmailService,
    NotificationService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}


