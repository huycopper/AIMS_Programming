import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { VietQRBoundary } from '../../boundaries/viet-qr/viet-qr.service.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction } from '../entities/payment-transaction.entity.js';
import { Order } from '../../order/entities/order.entity.js';

// file này thực thi duy nhất class PayThroughPaymentGatewayController
// class này là cầu nối giữa controller và boundary để xử lý nghiệp vụ thanh toán
// cụ thể: class này sẽ gọi hàm getAccessToken và generateQRCode của VietQRBoundary
// class này cũng xử lý nghiệp vụ: lưu transaction vào db, update order status

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

  async generateQRCode(invoice: Order): Promise<{ qrDataURL: string }> {
    this.logger.log(`Generating QR Code for invoice ${invoice.orderId}`);

    // Call getAccessToken on VietQRBoundary
    const accessToken = await this.vietQRBoundary.getAccessToken();

    // Call generateQRCode on VietQRBoundary
    const qrResult = await this.vietQRBoundary.generateQRCode(invoice, accessToken);

    return qrResult;
  }

  async handlePaymentCallback(transactionResult: any): Promise<void> {
    this.logger.log('Handling payment callback', transactionResult);

    const isValid = this.verifyCallbackData(transactionResult);
    if (!isValid) {
      throw new BadRequestException('Invalid callback data');
    }

    await this.saveTransaction(transactionResult);
  }

  verifyCallbackData(transactionResult: any): boolean {
    // In sandbox, we just check if it has an orderId and amount
    if (!transactionResult || !transactionResult.orderId || !transactionResult.amount) {
      return false;
    }
    return true;
  }

  private async saveTransaction(transactionResult: any): Promise<void> {
    this.logger.log('Saving transaction', transactionResult);

    const order = await this.orderRepo.findOne({ where: { orderId: transactionResult.orderId } });
    if (!order) {
      this.logger.error(`Order not found for ID ${transactionResult.orderId}`);
      throw new BadRequestException('Order not found');
    }

    const tx = this.paymentTransactionRepo.create({
      order: order,
      transactionRef: transactionResult.transactionRef || 'txn_' + Date.now(),
      amount: transactionResult.amount,
      paymentMethod: 'VIETQR',
      status: transactionResult.status === 'success' ? 'SUCCESS' : 'FAILED',
      paymentDetails: transactionResult,
    });

    await this.paymentTransactionRepo.save(tx);

    if (tx.status === 'SUCCESS') {
      // Update order status
      order.status = 'PENDING_PROCESSING';
      await this.orderRepo.save(order);
      
      // Simulate sending email
      this.simulateSendEmail(order, tx);
    }
  }

  private simulateSendEmail(order: Order, transaction: PaymentTransaction): void {
    this.logger.log(`[EMAIL SIMULATION] Sending email to customer for Order ${order.orderId}`);
    this.logger.log(`[EMAIL SIMULATION] Invoice & Transaction ${transaction.transactionRef} sent. Tracking link: http://localhost:4200/track/${order.orderId}`);
  }
}
