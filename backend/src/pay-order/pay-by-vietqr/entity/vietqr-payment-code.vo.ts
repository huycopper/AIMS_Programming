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
    const shortOrderId = this.deriveShortOrderId(order.orderId);
    const amount = Math.round(Number(order.totalAmount)); // làm tròn số tiền
    const content = this.derivePaymentContent(shortOrderId);
    return new VietQrPaymentCode(shortOrderId, amount, content);
  }

  // Rút gọn Order ID thành 13 ký tự (lấy 13 ký tự đầu tiên của Order ID sau khi đã loại bỏ dấu gạch ngang)
  static deriveShortOrderId(orderId: string): string {
    return orderId.replace(/-/g, '').substring(0, 13);
  }

  // Tạo nội dung thanh toán (ví dụ: "AIMS 1234567890123")
  static derivePaymentContent(shortOrderId: string): string {
    return `AIMS ${shortOrderId}`;
  }

  // Kiểm tra xem content thanh toán có khớp với payment code không
  validateMatches(callbackAmount: number, callbackContent: string): void {
    const roundedCallbackAmount = Math.round(Number(callbackAmount));

    if (!Number.isFinite(roundedCallbackAmount)) {
      throw new Error('Invalid transaction amount');
    }

    if (roundedCallbackAmount !== this.amount) {
      throw new Error(`Amount mismatch: expected ${this.amount}, received ${roundedCallbackAmount}`);
    }

    if (!callbackContent?.includes(this.content)) {
      throw new Error(`Content mismatch: expected content to include ${this.content}`);
    }
  }

  // Kiểm tra xem order ID hoặc content thanh toán có khớp với payment code không
  matchesCallback(
    callbackOrderId: string | undefined,
    callbackContent: string | undefined,
    fullOrderId: string,
  ): boolean {
    const trimmedCallbackOrderId = callbackOrderId?.trim();
    const content = callbackContent ?? '';

    return (
      fullOrderId === trimmedCallbackOrderId ||
      this.shortOrderId === trimmedCallbackOrderId ||
      // Dùng hàm includes() để kiểm tra xem một chuỗi nhỏ có nằm bên trong một chuỗi lớn hơn hay không.
      // Nếu có, nó trả về true, ngược lại trả về false.
      content.includes(this.content)
    );
  }
}
