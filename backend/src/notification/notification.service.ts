import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order } from '../order/entities/order.entity.js';
import { PaymentTransaction } from '../payment/entities/payment-transaction.entity.js';
import { RefundTransaction } from '../refund/entities/refund-transaction.entity.js';
import { EmailService } from './email/email.service.js';
import { buildPaymentSuccessEmail } from './email/payment-success-email.builder.js';
import { buildOrderCancelledEmail } from './email/order-cancelled-email.builder.js';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async sendPaymentSuccessNotification(order: Order, transaction: PaymentTransaction): Promise<void> {
    const to = order.deliveryInfo?.email;
    if (!to) {
      this.logger.warn(`Cannot send payment success email for order ${order.orderId}: No email address provided.`);
      return;
    }

    const appPublicUrl = this.configService.get<string>('APP_PUBLIC_URL', 'http://localhost:4200');
    const { subject, text, html } = buildPaymentSuccessEmail(order, transaction, appPublicUrl);

    await this.emailService.sendEmail(to, subject, html, text);
  }

  async sendOrderCancelledNotification(order: Order, refund: RefundTransaction): Promise<void> {
    const to = order.deliveryInfo?.email;
    if (!to) {
      this.logger.warn(`Cannot send order cancelled email for order ${order.orderId}: No email address provided.`);
      return;
    }

    const appPublicUrl = this.configService.get<string>('APP_PUBLIC_URL', 'http://localhost:4200');
    const { subject, text, html } = buildOrderCancelledEmail(order, refund, appPublicUrl);

    await this.emailService.sendEmail(to, subject, html, text);
  }
}
