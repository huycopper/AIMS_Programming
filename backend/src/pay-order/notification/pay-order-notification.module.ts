import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentSuccessNotificationControl } from './control/payment-success-notification.control.js';
import { PaymentSuccessEmailTemplateControl } from './control/payment-success-email-template.control.js';
import { EmailBoundary } from './boundary/email/email.boundary.js';
import { NodemailerEmailBoundary } from './boundary/email/nodemailer-email.boundary.js';

@Module({
  imports: [ConfigModule],
  providers: [
    PaymentSuccessNotificationControl,
    PaymentSuccessEmailTemplateControl,
    {
      provide: EmailBoundary,
      useClass: NodemailerEmailBoundary,
    },
  ],
  exports: [PaymentSuccessNotificationControl],
})
export class PayOrderNotificationModule {}
