import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { VietQRBoundary } from '../../boundaries/viet-qr/viet-qr.service.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction } from '../entities/payment-transaction.entity.js';
import { Order } from '../../order/entities/order.entity.js';

// file này thực thi duy nhất class PayThroughPaymentGatewayController
// class này là cầu nối giữa controller và boundary để xử lý nghiệp vụ thanh toán
// cụ thể: class này sẽ gọi hàm getAccessToken và generateQRCode của VietQRBoundary
// class này cũng xử lý nghiệp vụ: gọi API callback, lưu transaction vào db, update order status

@Injectable()
export class PayThroughPaymentGatewayController {
  private readonly logger = new Logger(PayThroughPaymentGatewayController.name); // Logger là class dùng để ghi log

  constructor(
    private readonly vietQRBoundary: VietQRBoundary, // VietQRBoundary là class dùng để gọi API của VietQR
    @InjectRepository(PaymentTransaction) // PaymentTransaction là entity dùng để lưu thông tin transaction vào db
    private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(Order) // Order là entity dùng để lưu thông tin order vào db
    private readonly orderRepo: Repository<Order>,
  ) { }

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
  private accessToken: string;

  async generateQRCode(invoice: Order): Promise<{ qrDataURL: string, amount: number, content: string }> {
    this.logger.log(`Generating QR Code for invoice ${invoice.orderId}`);

    // Call getAccessToken on VietQRBoundary
    this.accessToken = await this.vietQRBoundary.getAccessToken();

    // Call generateQRCode on VietQRBoundary
    const qrResult = await this.vietQRBoundary.generateQRCode(invoice, this.accessToken);

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
  async confirmPayment(order: Order): Promise<{ status: string; message: string; orderId: string }> {
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
  async handleAPICallback(order: Order): Promise<{ status: string; message: string }> {
    this.logger.log(`Handling API Callback for order ${order.orderId}`);

    // Lấy access token từ VietQR (cần token để gọi Test Callback API)
    // const accessToken = await this.vietQRBoundary.getAccessToken(); // accessToken đã được gọi 1 lần ở hàm generateQRCode rồi, liệu có cần gọi lần nữa? 

    // Gọi postAPICallback() trên VietQRBoundary (bước 2.1.1.1.1 trong SD v2)
    const result = await this.vietQRBoundary.postAPICallback(order, this.accessToken);

    this.logger.log(`API Callback result for order ${order.orderId}: ${JSON.stringify(result)}`);

    return result;
  }

  // ==================== Legacy methods (kept for backward compatibility) ====================

  //   async handlePaymentCallback(transactionResult: any): Promise<void> {
  //     this.logger.log('Handling payment callback (legacy)', transactionResult);

  //     const isValid = this.verifyCallbackData(transactionResult);
  //     if (!isValid) {
  //       throw new BadRequestException('Invalid callback data');
  //     }

  //     await this.saveTransaction(transactionResult);
  //   }

  //   verifyCallbackData(transactionResult: any): boolean {
  //     // In sandbox, we just check if it has an orderId and amount
  //     if (!transactionResult || !transactionResult.orderId || !transactionResult.amount) {
  //       return false;
  //     }
  //     return true;
  //   }

  //   private async saveTransaction(transactionResult: any): Promise<void> {
  //     this.logger.log('Saving transaction', transactionResult);

  //     const order = await this.orderRepo.findOne({ where: { orderId: transactionResult.orderId } });
  //     if (!order) {
  //       this.logger.error(`Order not found for ID ${transactionResult.orderId}`);
  //       throw new BadRequestException('Order not found');
  //     }

  //     const tx = this.paymentTransactionRepo.create({
  //       order: order,
  //       transactionRef: transactionResult.transactionRef || 'txn_' + Date.now(),
  //       amount: transactionResult.amount,
  //       paymentMethod: 'VIETQR',
  //       status: transactionResult.status === 'success' ? 'SUCCESS' : 'FAILED',
  //       paymentDetails: transactionResult,
  //     });

  //     await this.paymentTransactionRepo.save(tx);

  //     if (tx.status === 'SUCCESS') {
  //       // Update order status
  //       order.status = 'PENDING_PROCESSING';
  //       await this.orderRepo.save(order);

  //       // Simulate sending email
  //       this.simulateSendEmail(order, tx);
  //     }
  //   }

  //   private simulateSendEmail(order: Order, transaction: PaymentTransaction): void {
  //     this.logger.log(`[EMAIL SIMULATION] Sending email to customer for Order ${order.orderId}`);
  //     this.logger.log(`[EMAIL SIMULATION] Invoice & Transaction ${transaction.transactionRef} sent. Tracking link: http://localhost:4200/track/${order.orderId}`);
  //   }
}
