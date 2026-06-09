import { Injectable, Logger } from '@nestjs/common';
import { VietQRBoundary } from '../../boundaries/viet-qr/viet-qr.service.js';
import { Order } from '../../order/entities/order.entity.js';

// file này thực thi duy nhất class PayThroughPaymentGatewayController
// class này là cầu nối giữa controller và boundary để xử lý nghiệp vụ thanh toán
// cụ thể: class này sẽ gọi hàm getAccessToken và generateQRCode của VietQRBoundary
// phần lưu transaction và update order status nằm ở TransactionSyncController khi VietQR callback về

@Injectable()
export class PayThroughPaymentGatewayController {
  private readonly logger = new Logger(PayThroughPaymentGatewayController.name); // Logger là class dùng để ghi log

  constructor(
    private readonly vietQRBoundary: VietQRBoundary, // VietQRBoundary là class dùng để gọi API của VietQR
  ) {}

  /*
  Dưới đây là cách Promise hoạt động cụ thể trong hàm generateQRCode của bạn:

  1. Hàm trả về một Promise (Promise<{ qrDataURL: string }>)
  
    async generateQRCode(invoice: Order): Promise<{ qrDataURL: string }> {
    
  Việc tạo QR code đòi hỏi phải gọi API qua mạng tới hệ thống VietQR. Việc này tốn thời gian (có thể mất vài trăm mili-giây đến vài giây).
  Thay vì bắt toàn bộ hệ thống phải "đóng băng" đứng chờ VietQR trả lời, hàm này lập tức trả về một Promise.
  Dấu <{ qrDataURL: string }> mang ý nghĩa: "Tôi hứa rằng khi nào gọi API xong, tôi sẽ trả lại cho bạn một object có chứa chuỗi qrDataURL".
  Từ khóa async ở đầu hàm khai báo rằng đây là một hàm bất đồng bộ. Bất cứ hàm nào có chữ async đều sẽ tự động trả về một Promise.
 
  2. Tạm dừng để chờ Promise hoàn thành với từ khóa await
 
    const accessToken = await this.vietQRBoundary.getAccessToken();

  Hàm getAccessToken() bản thân nó cũng phải gọi mạng và trả về một Promise.
  Từ khóa await ở đây giống như việc bạn nói: "Hãy tạm dừng chạy các dòng code tiếp theo trong hàm này, đứng chờ cho đến khi cái Promise của getAccessToken hoàn thành và lấy được chuỗi token thật, rồi mới gán vào biến accessToken".
 
    const qrResult = await this.vietQRBoundary.generateQRCode(invoice, accessToken);
  
  Tương tự, ta lại có một await khác. Code sẽ tiếp tục chờ generateQRCode của VietQR gọi xong API và trả về kết quả thật, rồi mới gán vào qrResult.
  
  3. Trả về kết quả thực tế
  
    return qrResult;
  
  qrResult cũng biến thành promise do hàm được khai báo là async.
  */
  async generateQRCode(
    invoice: Order,
  ): Promise<{ qrDataURL: string; amount: number; content: string }> {
    this.logger.log(`Generating QR Code for invoice ${invoice.orderId}`);

    const accessToken = await this.vietQRBoundary.getAccessToken();
    const qrResult = await this.vietQRBoundary.generateQRCode(
      invoice,
      accessToken,
    );

    return qrResult;
  }

  /**
   * Bước 2.1.1 trong Sequence Diagram v2: confirmPayment(order)
   *
   * Luồng xử lý theo SD v2:
   * 1. PayOrderController gọi confirmPayment(order) → PayThroughPaymentGatewayController
   * 2. PayThroughPaymentGatewayController gọi handleAPICallback(order) → VietQRBoundary
   * 3. VietQRBoundary gọi postAPICallback(order, accessToken) → VietQR Sandbox
   * 4. VietQR Sandbox nhận request → tự gọi Transaction Sync (postAPIToAIMS()) về AIMS Backend
   * 5. AIMS Backend nhận Transaction Sync → trả referenceTransactionId → paymentStatus trả về
   *
   * Lưu ý: Việc lưu PaymentTransaction và update order status đã được xử lý
   * trong TransactionSyncController (postAPIToAIMS) khi VietQR callback về.
   * Hàm này chỉ cần gọi API Test Callback để trigger luồng.
   *
   * @param order - Đơn hàng cần xác nhận thanh toán
   * @returns paymentStatus - Kết quả thanh toán { status, message, orderId }
   */
  async confirmPayment(
    order: Order,
  ): Promise<{ status: string; message: string; orderId: string }> {
    this.logger.log(`Confirming payment for order ${order.orderId}`);

    // Gọi handleAPICallback() theo SD v2 (bước 2.1.1.1)
    const callbackResult = await this.handleAPICallback(order);

    return {
      status: callbackResult.status,
      message: callbackResult.message,
      orderId: order.orderId,
    };
  }

  /**
   * Bước 2.1.1.1 trong Sequence Diagram v2: handleAPICallback(order)
   *
   * Lấy access token từ VietQR và gọi postAPICallback() trên VietQRBoundary
   * để trigger VietQR gửi Transaction Sync callback về AIMS.
   *
   * @param order - Đơn hàng cần xác nhận
   * @returns Kết quả từ VietQR Test Callback { status, message }
   */
  async handleAPICallback(
    order: Order,
  ): Promise<{ status: string; message: string }> {
    this.logger.log(`Handling API Callback for order ${order.orderId}`);

    // Token VietQR hết hạn nhanh, nên confirmPayment luôn lấy token mới trước khi gọi Test Callback.
    const accessToken = await this.vietQRBoundary.getAccessToken();
    const result = await this.vietQRBoundary.postAPICallback(
      order,
      accessToken,
    );

    this.logger.log(
      `API Callback result for order ${order.orderId}: ${JSON.stringify(result)}`,
    );

    return result;
  }
}
