import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email/email.service.js';
import { NotificationService } from './notification.service.js';
import { EmailBoundary } from '../pay-order/notification/boundary/email/email.boundary.js';
import { NodemailerEmailBoundary } from '../pay-order/notification/boundary/email/nodemailer-email.boundary.js';

@Module({
  imports: [ConfigModule],
  providers: [
    EmailService,
    NotificationService,
    {
      provide: EmailBoundary,
      useClass: NodemailerEmailBoundary,
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}

