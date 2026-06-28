import { Order } from '../../../order/entities/order.entity.js';

export class VietQrPaymentCode {
  readonly shortOrderId: string;
  readonly amount: number;
  readonly content: string;

  constructor(shortOrderId: string, amount: number, content: string) {
    this.shortOrderId = shortOrderId;
    this.amount = amount;
    this.content = content;
  }

  // Tạo payment code từ order
  static fromOrder(order: Order): VietQrPaymentCode {
    const shortOrderId = order.orderId.replace(/-/g, '').substring(0, 13); // Rút gọn Order ID thành 13 ký tự (lấy 13 ký tự đầu tiên của Order ID sau khi đã loại bỏ dấu gạch ngang)
    const content = `AIMS ${shortOrderId}`; // Tạo nội dung thanh toán (ví dụ: "AIMS 1234567890123")
    const amount = Math.round(Number(order.totalAmount)); // làm tròn số tiền
    return new VietQrPaymentCode(shortOrderId, amount, content);
  }

  // Kiểm tra xem content thanh toán có khớp với payment code không
  matchesCallback(transactionSyncBodyContent: string): boolean {
    const callbackContent = transactionSyncBodyContent;
    return callbackContent.includes(this.content);
    // Dùng hàm includes() để kiểm tra xem một chuỗi nhỏ có nằm bên trong một chuỗi lớn hơn hay không.
    // Nếu có, nó trả về true, ngược lại trả về false.
  }
}
