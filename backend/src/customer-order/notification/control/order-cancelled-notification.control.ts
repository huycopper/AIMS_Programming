import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order } from '../../../order/entities/order.entity.js';
import { RefundTransaction } from '../../../refund/entities/refund-transaction.entity.js';
import { EmailBoundary } from '../../../pay-order/notification/boundary/email/email.boundary.js';
import { OrderCancelledEmailTemplateControl } from './order-cancelled-email-template.control.js';

@Injectable()
export class OrderCancelledNotificationControl {
  private readonly logger = new Logger(OrderCancelledNotificationControl.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly emailBoundary: EmailBoundary,
    private readonly templateControl: OrderCancelledEmailTemplateControl,
  ) {}

  async sendOrderCancelledNotification(
    order: Order,
    refund: RefundTransaction,
  ): Promise<void> {
    const to = order.deliveryInfo?.email;
    if (!to) {
      this.logger.warn(
        `Cannot send order cancelled email for order ${order.orderId}: No email address provided.`,
      );
      return;
    }

    const appPublicUrl = this.configService.get<string>(
      'APP_PUBLIC_URL',
      'http://localhost:4200',
    );
    const message = this.templateControl.buildMessage(
      order,
      refund,
      appPublicUrl,
    );

    await this.emailBoundary.sendEmail(message);
  }
}
