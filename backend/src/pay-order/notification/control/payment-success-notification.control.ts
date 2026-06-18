import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order } from '../../../order/entities/order.entity.js';
import { PaymentTransaction } from '../../../payment/entities/payment-transaction.entity.js';
import { EmailBoundary } from '../boundary/email/email.boundary.js';
import { PaymentSuccessEmail } from '../entity/payment-success-email.model.js';
import { PaymentSuccessEmailTemplateControl } from './payment-success-email-template.control.js';
import { PaymentSuccessNotificationResult } from '../entity/payment-success-notification-result.model.js';

@Injectable()
export class PaymentSuccessNotificationControl {
  private readonly logger = new Logger(PaymentSuccessNotificationControl.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly emailBoundary: EmailBoundary,
    private readonly templateControl: PaymentSuccessEmailTemplateControl,
  ) {}

  async sendPaymentSuccessNotification(
    order: Order,
    transaction: PaymentTransaction,
  ): Promise<PaymentSuccessNotificationResult> {
    const to = order.deliveryInfo?.email;
    if (!to) {
      this.logger.warn(
        `Cannot send payment success email for order ${order.orderId}: No email address provided.`,
      );
      // Returns success/skipped result to match non-throwing behavior that sets receiptEmailSentAt.
      return PaymentSuccessNotificationResult.success(new Date());
    }

    try {
      const appPublicUrl = this.configService.get<string>(
        'APP_PUBLIC_URL',
        'http://localhost:4200',
      );

      const emailData = new PaymentSuccessEmail(order, transaction, appPublicUrl);
      const emailMessage = this.templateControl.buildMessage(emailData);

      await this.emailBoundary.sendEmail(emailMessage);

      return PaymentSuccessNotificationResult.success(new Date());
    } catch (error: any) {
      this.logger.error(
        `Failed to send receipt email for order ${order.orderId}: ${error.message}`,
        error.stack,
      );
      return PaymentSuccessNotificationResult.failure(error.message);
    }
  }
}
