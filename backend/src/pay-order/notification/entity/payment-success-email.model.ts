import { Order } from '../../../order/entities/order.entity.js';
import { PaymentTransaction } from '../../../payment/entities/payment-transaction.entity.js';

export class PaymentSuccessEmail {
  public readonly recipientEmail: string; // Địa chỉ email của người nhận thông báo
  public readonly customerName: string; // Tên của khách hàng nhận email
  public readonly totalAmountFormatted: string; // Tổng tiền đơn hàng đã được format chuẩn tiền tệ (VND)
  public readonly orderId: string; // Mã định danh đơn hàng trên hệ thống
  public readonly transactionRef: string; // Mã tham chiếu giao dịch (từ cổng thanh toán)
  public readonly paymentMethod: string; // Phương thức thanh toán (ví dụ: VIETQR)
  public readonly viewOrderUrl: string; // Đường dẫn công khai để khách hàng tra cứu chi tiết đơn hàng
  public readonly cancelOrderUrl: string; // Đường dẫn công khai cho phép khách hàng hủy đơn hàng

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
