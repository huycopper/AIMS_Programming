import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order } from '../entities/order.entity.js';
import { RefundTransaction } from '../../refund/entities/refund-transaction.entity.js';
import { EmailBoundary } from '../../pay-order/notification/boundary/email/email.boundary.js';
import { EmailMessage } from '../../pay-order/notification/entity/email-message.model.js';

export interface FulfillmentNotificationResult {
  sent: boolean;
  skipped?: boolean;
  error?: string;
}

@Injectable()
export class OrderFulfillmentNotificationControl {
  private readonly logger = new Logger(
    OrderFulfillmentNotificationControl.name,
  );

  constructor(
    private readonly configService: ConfigService,
    private readonly emailBoundary: EmailBoundary,
  ) {}

  async sendApproved(order: Order): Promise<FulfillmentNotificationResult> {
    return this.send(order, 'APPROVED');
  }

  async sendRejected(
    order: Order,
    refund: RefundTransaction | null,
  ): Promise<FulfillmentNotificationResult> {
    return this.send(order, 'REJECTED', refund);
  }

  private async send(
    order: Order,
    status: 'APPROVED' | 'REJECTED',
    refund?: RefundTransaction | null,
  ): Promise<FulfillmentNotificationResult> {
    const to = order.deliveryInfo?.email;
    if (!to) {
      this.logger.warn(
        `Cannot send ${status} email for order ${order.orderId}: no email address.`,
      );
      return { sent: false, skipped: true };
    }

    try {
      await this.emailBoundary.sendEmail(
        this.buildMessage(order, status, refund),
      );
      return { sent: true };
    } catch (error: any) {
      this.logger.error(
        `Failed to send ${status} email for order ${order.orderId}: ${error.message}`,
        error.stack,
      );
      return { sent: false, error: error.message };
    }
  }

  private buildMessage(
    order: Order,
    status: 'APPROVED' | 'REJECTED',
    refund?: RefundTransaction | null,
  ): EmailMessage {
    const appPublicUrl = this.configService.get<string>(
      'APP_PUBLIC_URL',
      'http://localhost:4200',
    );
    const viewOrderUrl = `${appPublicUrl}/orders/view/${order.orderViewToken}`;
    const refundText = refund ? this.refundText(refund) : '';
    const subject = `[AIMS] Order ${status.toLowerCase()} - Order #${order.orderId}`;

    const text = `
Dear ${order.deliveryInfo?.name || 'Customer'},

Your order #${order.orderId} is now ${status}.
${refundText ? `\n${refundText}\n` : ''}
To view your order details, visit:
${viewOrderUrl}

Best regards,
AIMS Store Team
    `.trim();

    const html = `
<h2>Order ${status.toLowerCase()}</h2>
<p>Dear ${order.deliveryInfo?.name || 'Customer'},</p>
<p>Your order <strong>#${order.orderId}</strong> is now <strong>${status}</strong>.</p>
${refundText ? `<p>${refundText}</p>` : ''}
<p><a href="${viewOrderUrl}">View Order Details</a></p>
<p>Best regards,<br>AIMS Store Team</p>
    `.trim();

    return new EmailMessage(
      order.deliveryInfo?.email || '',
      subject,
      html,
      text,
    );
  }

  private refundText(refund: RefundTransaction): string {
    const amount = Number(refund.refundAmount).toLocaleString('vi-VN') + ' VND';
    if (refund.refundStatus === 'MANUAL_REQUIRED') {
      return `A manual refund of ${amount} is required. Our team will contact you to process a bank transfer.`;
    }
    if (refund.refundStatus === 'FAILED') {
      return `A refund of ${amount} could not be completed automatically and needs staff follow-up.`;
    }
    return `A refund of ${amount} is being processed.`;
  }
}
