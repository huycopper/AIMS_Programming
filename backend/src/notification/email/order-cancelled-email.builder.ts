import { Order } from '../../order/entities/order.entity.js';
import { RefundTransaction } from '../../refund/entities/refund-transaction.entity.js';

export function buildOrderCancelledEmail(
  order: Order,
  refund: RefundTransaction,
  appPublicUrl: string,
) {
  const viewOrderUrl = `${appPublicUrl}/orders/view/${order.orderViewToken}`;
  
  const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
  const totalAmount = formatter.format(Number(order.totalAmount));
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

Cancellation Reason: ${order.cancelReason || 'Customer requested cancellation'}

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
    
    <p><strong>Cancellation Reason:</strong> ${order.cancelReason || 'Customer requested cancellation'}</p>

    ${refundHtmlInfo}

    <p>
      <a href="${viewOrderUrl}">View Order Details</a>
    </p>
    
    <p>Best regards,<br>AIMS Store Team</p>
  `.trim();

  return { subject, text, html };
}
