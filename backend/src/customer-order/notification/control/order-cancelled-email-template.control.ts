import { Injectable } from '@nestjs/common';
import { Order } from '../../../order/entities/order.entity.js';
import { RefundTransaction } from '../../../refund/entities/refund-transaction.entity.js';
import { EmailMessage } from '../../../pay-order/notification/entity/email-message.model.js';

@Injectable()
export class OrderCancelledEmailTemplateControl {
  buildMessage(
    order: Order,
    refund: RefundTransaction,
    appPublicUrl: string,
  ): EmailMessage {
    const to = order.deliveryInfo?.email || '';
    const viewOrderUrl = `${appPublicUrl}/orders/view/${order.orderViewToken}`;

    const formatter = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    });
    const refundAmount = formatter.format(Number(refund.refundAmount));

    const subject = `[AIMS] Order Cancelled - Order #${order.orderId}`;

    let refundTextInfo = '';
    let refundHtmlInfo = '';

    if (refund.refundStatus === 'MANUAL_REQUIRED') {
      refundTextInfo = `A refund of ${refundAmount} is required. Our team will contact you shortly to process a manual bank transfer.`;
      refundHtmlInfo = `<p>A refund of <strong>${refundAmount}</strong> is required. Our team will contact you shortly to process a manual bank transfer.</p>`;
    } else {
      refundTextInfo = `A refund of ${refundAmount} is being processed.`;
      refundHtmlInfo = `<p>A refund of <strong>${refundAmount}</strong> is being processed.</p>`;
    }

    const text = `
Dear ${order.deliveryInfo?.name || 'Customer'},

Your order #${order.orderId} has been successfully cancelled.

${refundTextInfo}

To view your order details, visit:
${viewOrderUrl}

Best regards,
AIMS Store Team
  `.trim();

    const html = `
    <h2>Order Cancelled</h2>
    <p>Dear ${order.deliveryInfo?.name || 'Customer'},</p>
    <p>Your order <strong>#${order.orderId}</strong> has been successfully cancelled.</p>

    ${refundHtmlInfo}

    <p>
      <a href="${viewOrderUrl}">View Order Details</a>
    </p>
    
    <p>Best regards,<br>AIMS Store Team</p>
  `.trim();

    return new EmailMessage(to, subject, html, text);
  }
}
