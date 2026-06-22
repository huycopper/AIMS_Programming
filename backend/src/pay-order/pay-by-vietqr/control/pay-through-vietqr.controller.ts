import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { VietQRBoundary } from '../boundary/gateway/vietqr.boundary.js';
import { Order } from '../../../order/entities/order.entity.js';
import { PaymentTransaction } from '../../../payment/entities/payment-transaction.entity.js';
import { PaymentConfirmationResponse } from '../boundary/http/dto/payment-confirmation.response.js';

@Injectable()
export class PayThroughVietQRController {
  private readonly logger = new Logger(PayThroughVietQRController.name);

  private accessToken: string;

  constructor(
    private readonly vietQRBoundary: VietQRBoundary,
    private readonly jwtService: JwtService,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async generateQRCode(
    order: Order,
  ): Promise<{ qrDataURL: string; amount: number; content: string }> {
    this.logger.log(`Generating QR Code for invoice ${order.orderId}`);

    this.accessToken = await this.vietQRBoundary.getAccessToken();
    const qrResult = await this.vietQRBoundary.generateQRCode(
      order,
      this.accessToken,
    );

    return qrResult;
  }

  /**
   * Gửi yêu cầu callback thanh toán đến VietQR và chờ ngắn hạn để tiến trình
   * đồng bộ webhook lưu giao dịch thành công.
   */
  async confirmPayment(order: Order): Promise<PaymentConfirmationResponse> {
    this.logger.log(`Confirming payment for order ${order.orderId}`);

    const callbackResult = await this.vietQRBoundary.handleAPICallback(
      order,
      this.accessToken,
    );

    this.logger.log(
      `API Callback result for order ${order.orderId}: ${JSON.stringify(callbackResult)}`,
    );

    if (callbackResult.status !== 'SUCCESS') {
      return this.buildPaymentConfirmationResponse(
        order,
        null,
        callbackResult.status,
        callbackResult.message,
      );
    }

    const confirmation = await this.waitForSuccessfulPayment(
      order.orderId,
      callbackResult.message,
    );
    if (confirmation.transaction) {
      return confirmation;
    }

    return {
      ...confirmation,
      status: 'PENDING_CONFIRMATION',
      message:
        'VietQR accepted the payment callback request. Waiting for transaction sync.',
    };
  }

  /**
   * Đọc trạng thái thanh toán mới nhất của đơn hàng và chuyển đơn sang trạng
   * thái chờ xử lý khi đã có giao dịch thanh toán thành công.
   */
  async getPaymentConfirmation(
    orderId: string,
  ): Promise<PaymentConfirmationResponse> {
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

  /**
   * Kiểm tra lặp trong thời gian ngắn vì VietQR có thể chấp nhận callback trước
   * khi webhook kịp đồng bộ giao dịch vào hệ thống.
   */
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

  /**
   * Trả về giao dịch thành công mới nhất của đơn hàng nếu webhook đã đồng bộ
   * giao dịch đó vào hệ thống.
   */
  private async findLatestSuccessfulTransaction(
    orderId: string,
  ): Promise<PaymentTransaction | null> {
    const transaction = await this.paymentTransactionRepo
      .createQueryBuilder('transaction')
      .innerJoin('transaction.order', 'order')
      .where('order.orderId = :orderId', { orderId })
      .andWhere('transaction.status = :status', { status: 'SUCCESS' })
      .orderBy('transaction.createdAt', 'DESC')
      .getOne();

    return transaction ?? null;
  }

  /**
   * Tạo cấu trúc phản hồi dùng chung cho xác nhận thanh toán và các
   * lần kiểm tra trạng thái sau đó.
   */
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
      transaction: transaction
        ? this.buildTransactionSummary(transaction)
        : undefined,
    };
  }

  /**
   * Trích xuất các trường giao dịch cần trả về cho client, đồng thời giữ các
   * mã định danh dự phòng từ cả dữ liệu VietQR và dữ liệu giao dịch nội bộ.
   */
  private buildTransactionSummary(transaction: PaymentTransaction) {
    const details = transaction.paymentDetails || {};

    return {
      transactionId:
        details.transactionid ||
        transaction.transactionRef ||
        transaction.paymentTransactionId,
      paymentTransactionId: transaction.paymentTransactionId,
      transactionReference:
        transaction.transactionRef || details.referencenumber || '',
      transactionContent: details.content || '',
      transactionDatetime: this.resolveTransactionDatetime(transaction),
      amount: Number(transaction.amount),
      paymentMethod: transaction.paymentMethod,
      status: transaction.status,
    };
  }

  /**
   * Chuẩn hóa thời gian giao dịch VietQR từ epoch giây, epoch mili giây, chuỗi
   * ngày giờ hoặc thời gian tạo giao dịch nội bộ khi thiếu dữ liệu VietQR.
   */
  private resolveTransactionDatetime(transaction: PaymentTransaction): string {
    const rawDatetime = transaction.paymentDetails?.transactiontime;

    if (typeof rawDatetime === 'number' && Number.isFinite(rawDatetime)) {
      const epochMs =
        rawDatetime < 1_000_000_000_000 ? rawDatetime * 1000 : rawDatetime;
      return new Date(epochMs).toISOString();
    }

    if (typeof rawDatetime === 'string' && rawDatetime.trim()) {
      const parsedNumber = Number(rawDatetime);
      if (Number.isFinite(parsedNumber)) {
        const epochMs =
          parsedNumber < 1_000_000_000_000 ? parsedNumber * 1000 : parsedNumber;
        return new Date(epochMs).toISOString();
      }

      const parsedDate = new Date(rawDatetime);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString();
      }
    }

    return new Date(transaction.createdAt).toISOString();
  }

  /** Tạm dừng giữa các lần kiểm tra xác nhận thanh toán. */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
