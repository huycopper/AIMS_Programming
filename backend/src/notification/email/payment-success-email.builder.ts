import { Order } from '../../order/entities/order.entity.js';
import { PaymentTransaction } from '../../payment/entities/payment-transaction.entity.js';

export function buildPaymentSuccessEmail(
  order: Order,
  transaction: PaymentTransaction,
  appPublicUrl: string,
) {
  const viewOrderUrl = `${appPublicUrl}/orders/view/${order.orderViewToken}`;
  const cancelOrderUrl = `${appPublicUrl}/orders/cancel/${order.cancelToken}`;
  
  const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
  const totalAmount = formatter.format(Number(order.totalAmount));

  const subject = `[AIMS] Payment Successful - Order #${order.orderId}`;

  const text = `
Dear ${order.deliveryInfo?.name || 'Customer'},

Thank you for your purchase! Your payment of ${totalAmount} was successful.
We are now processing your order.

Order ID: ${order.orderId}
Transaction Ref: ${transaction.transactionRef}
Payment Method: ${transaction.paymentMethod}

To view your order details or track the status, visit:
${viewOrderUrl}

If you made a mistake, you can cancel your order here (before it is approved):
${cancelOrderUrl}

Best regards,
AIMS Store Team
  `.trim();

  const html = `
    <h2>Thank you for your purchase!</h2>
    <p>Dear ${order.deliveryInfo?.name || 'Customer'},</p>
    <p>Your payment of <strong>${totalAmount}</strong> was successful. We are now processing your order.</p>
    
    <h3>Order Summary</h3>
    <ul>
      <li><strong>Order ID:</strong> ${order.orderId}</li>
      <li><strong>Transaction Ref:</strong> ${transaction.transactionRef}</li>
      <li><strong>Payment Method:</strong> ${transaction.paymentMethod}</li>
    </ul>

    <p>
      <a href="${viewOrderUrl}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Order Details</a>
    </p>
    
    <p>
      <small>If you made a mistake, you can <a href="${cancelOrderUrl}">cancel your order</a> before it is approved.</small>
    </p>
    
    <p>Best regards,<br>AIMS Store Team</p>
  `.trim();

  return { subject, text, html };
}
