import { Order } from '../../../order/entities/order.entity.js';
import { PaymentTransaction } from '../../../payment/entities/payment-transaction.entity.js';

export class PaymentSuccessEmail {
  public readonly recipientEmail: string;
  public readonly customerName: string;
  public readonly totalAmountFormatted: string;
  public readonly orderId: string;
  public readonly transactionRef: string;
  public readonly paymentMethod: string;
  public readonly viewOrderUrl: string;
  public readonly cancelOrderUrl: string;

  constructor(
    order: Order,
    transaction: PaymentTransaction,
    appPublicUrl: string,
  ) {
    this.recipientEmail = order.deliveryInfo?.email || '';
    this.customerName = order.deliveryInfo?.name || 'Customer';

    const formatter = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    });
    this.totalAmountFormatted = formatter.format(Number(order.totalAmount));

    this.orderId = order.orderId;
    this.transactionRef = transaction.transactionRef;
    this.paymentMethod = transaction.paymentMethod;
    this.viewOrderUrl = `${appPublicUrl}/orders/view/${order.orderViewToken}`;
    this.cancelOrderUrl = `${appPublicUrl}/orders/cancel/${order.cancelToken}`;
  }
}
