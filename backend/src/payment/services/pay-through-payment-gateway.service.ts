import { BadRequestException, Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VietQRBoundary } from '../../boundaries/viet-qr/viet-qr.service.js';
import { Order } from '../../order/entities/order.entity.js';
import { PaymentTransaction } from '../entities/payment-transaction.entity.js';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';

export interface PaymentConfirmationResponse {
  status: string;
  message: string;
  orderId: string;
  order?: {
    orderId: string;
    status: string;
    customerName: string;
    phoneNumber: string;
    shippingAddress: string;
    province: string;
    totalAmount: number;
    email: string;
  };
  transaction?: {
    transactionId: string;
    paymentTransactionId: string;
    transactionReference: string;
    transactionContent: string;
    transactionDatetime: string;
    amount: number;
    paymentMethod: string;
    status: string;
  };
}

@Injectable()
export class PayThroughPaymentGatewayController {
  private readonly logger = new Logger(PayThroughPaymentGatewayController.name); // Logger là class dùng để ghi log

  private accessToken: string;

  constructor(
    private readonly vietQRBoundary: VietQRBoundary,
    private readonly jwtService: JwtService,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(Order)
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

  async generateQRCode(order: Order): Promise<{ qrDataURL: string; amount: number; content: string }> {
    this.logger.log(`Generating QR Code for invoice ${order.orderId}`);

    this.accessToken = await this.vietQRBoundary.getAccessToken();
    const qrResult = await this.vietQRBoundary.generateQRCode(order, this.accessToken);

    return qrResult;
  }

  async confirmPayment(order: Order): Promise<PaymentConfirmationResponse> {
    this.logger.log(`Confirming payment for order ${order.orderId}`);

    const callbackResult = await this.vietQRBoundary.handleAPICallback(order, this.accessToken);

    this.logger.log(`API Callback result for order ${order.orderId}: ${JSON.stringify(callbackResult)}`);

    if (callbackResult.status !== 'SUCCESS') {
      return this.buildPaymentConfirmationResponse(order, null, callbackResult.status, callbackResult.message);
    }

    const confirmation = await this.waitForSuccessfulPayment(order.orderId, callbackResult.message);
    if (confirmation.transaction) {
      return confirmation;
    }

    return {
      ...confirmation,
      status: 'PENDING_CONFIRMATION',
      message: 'VietQR accepted the payment callback request. Waiting for transaction sync.',
    };
  }

  async getPaymentConfirmation(orderId: string): Promise<PaymentConfirmationResponse> {
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const transaction = await this.findLatestSuccessfulTransaction(orderId);
    if (!transaction) {
      return this.buildPaymentConfirmationResponse(
        order,
        null,
        order.status,
        'Payment transaction has not been recorded yet.',
      );
    }

    if (order.status !== 'PENDING_PROCESSING') {
      order.status = 'PENDING_PROCESSING';
      await this.orderRepo.save(order);
    }

    return this.buildPaymentConfirmationResponse(
      order,
      transaction,
      'SUCCESS',
      'Payment confirmed successfully.',
    );
  }

  private async waitForSuccessfulPayment(
    orderId: string,
    message: string,
  ): Promise<PaymentConfirmationResponse> {
    const maxAttempts = 10;
    const delayMs = 500;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const confirmation = await this.getPaymentConfirmation(orderId);
      if (confirmation.transaction) {
        return {
          ...confirmation,
          message: 'Payment confirmed successfully.',
        };
      }
      await this.delay(delayMs);
    }

    const lastConfirmation = await this.getPaymentConfirmation(orderId);
    return {
      ...lastConfirmation,
      message,
    };
  }

  private async findLatestSuccessfulTransaction(orderId: string): Promise<PaymentTransaction | null> {
    const transaction = await this.paymentTransactionRepo
      .createQueryBuilder('transaction')
      .innerJoin('transaction.order', 'order')
      .where('order.orderId = :orderId', { orderId })
      .andWhere('transaction.status = :status', { status: 'SUCCESS' })
      .orderBy('transaction.createdAt', 'DESC')
      .getOne();

    return transaction ?? null;
  }

  private buildPaymentConfirmationResponse(
    order: Order,
    transaction: PaymentTransaction | null,
    status: string,
    message: string,
  ): PaymentConfirmationResponse {
    return {
      status,
      message,
      orderId: order.orderId,
      order: {
        orderId: order.orderId,
        status: order.status,
        customerName: order.deliveryInfo?.name || '',
        phoneNumber: order.deliveryInfo?.phone || '',
        shippingAddress: order.deliveryInfo?.address || '',
        province: order.deliveryInfo?.province || '',
        totalAmount: Number(order.totalAmount),
        email: order.deliveryInfo?.email || '',
      },
      transaction: transaction ? this.buildTransactionSummary(transaction) : undefined,
    };
  }

  private buildTransactionSummary(transaction: PaymentTransaction) {
    const details = transaction.paymentDetails || {};

    return {
      transactionId: details.transactionid || transaction.transactionRef || transaction.paymentTransactionId,
      paymentTransactionId: transaction.paymentTransactionId,
      transactionReference: transaction.transactionRef || details.referencenumber || '',
      transactionContent: details.content || '',
      transactionDatetime: this.resolveTransactionDatetime(transaction),
      amount: Number(transaction.amount),
      paymentMethod: transaction.paymentMethod,
      status: transaction.status,
    };
  }

  private resolveTransactionDatetime(transaction: PaymentTransaction): string {
    const rawDatetime = transaction.paymentDetails?.transactiontime;

    if (typeof rawDatetime === 'number' && Number.isFinite(rawDatetime)) {
      const epochMs = rawDatetime < 1_000_000_000_000 ? rawDatetime * 1000 : rawDatetime;
      return new Date(epochMs).toISOString();
    }

    if (typeof rawDatetime === 'string' && rawDatetime.trim()) {
      const parsedNumber = Number(rawDatetime);
      if (Number.isFinite(parsedNumber)) {
        const epochMs = parsedNumber < 1_000_000_000_000 ? parsedNumber * 1000 : parsedNumber;
        return new Date(epochMs).toISOString();
      }

      const parsedDate = new Date(rawDatetime);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString();
      }
    }

    return new Date(transaction.createdAt).toISOString();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Hàm này để hứng request từ VietQR khi VietQR POST API generate_token để lấy token của client
   * @param username - Username của client
   * @param password - Password của client
   * @returns JWT token của client
   */
  generateJWTToken(username: string, password: string) {
    this.logger.log(`Generating JWT token for client username: ${username}`);

    if (
      username === process.env.CLIENT_USERNAME &&
      password === process.env.CLIENT_PASSWORD
    ) {
      if (!process.env.JWT_SECRET) {
        this.logger.error('JWT_SECRET is not configured');
        throw new InternalServerErrorException({
          status: 'FAILED',
          message: 'JWT_SECRET is not configured',
        });
      }

      const JWT_token = this.jwtService.sign(
        { username },
        {
          secret: process.env.JWT_SECRET,
          algorithm: 'HS512',
          expiresIn: '5m', // Token hết hạn sau 5 phút
        },
      );

      this.logger.log('JWT token generated successfully');

      return {
        access_token: JWT_token,
        token_type: 'Bearer',
        expires_in: 300,
      };
    } else {
      this.logger.warn(`Invalid credentials provided for username: ${username}`);
      throw new UnauthorizedException({
        status: 'FAILED',
        message: 'INVALID_CREDENTIALS',
      });
    }
  }

}
