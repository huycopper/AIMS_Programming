import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction } from '../../../payment/entities/payment-transaction.entity.js';
import { Order } from '../../../order/entities/order.entity.js';
import { TransactionCallbackDto } from '../entity/vietqr-transaction-sync.dto.js';
import { VietQrOrderMatcherControl } from './vietqr-order-matcher.control.js';
import { VietQrPaymentTransactionFactory } from './vietqr-payment-transaction-factory.js';
import { VietQrPaymentCode } from '../entity/vietqr-payment-code.vo.js';
import { PaymentSuccessNotificationControl } from '../../notification/control/payment-success-notification.control.js';
import { randomUUID } from 'crypto';

@Injectable()
export class VietQrTransactionSyncControl {
  private readonly logger = new Logger(VietQrTransactionSyncControl.name);

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly orderMatcher: VietQrOrderMatcherControl,
    private readonly transactionFactory: VietQrPaymentTransactionFactory,
    private readonly paymentSuccessNotificationControl: PaymentSuccessNotificationControl,
  ) {}

  async syncTransaction(
    transactionSyncBody: TransactionCallbackDto,
  ): Promise<{ refTransactionId: string }> {
    // Bước 1: Tải toàn bộ danh sách đơn hàng và tìm đơn hàng khớp với callback
    const order = await this.orderMatcher.matchOrder(transactionSyncBody);
    if (!order) {
      this.logger.warn(
        `Order not found for orderId: ${transactionSyncBody.orderId}`,
      );
      throw new Error(
        `Order not found for orderId: ${transactionSyncBody.orderId}`,
      );
    }
    this.logger.log(
      `Found matching order: ${order.orderId} (status: ${order.status})`,
    );

    // Bước 2: Kiểm tra tính hợp lệ của giao dịch so với đơn hàng (số tiền, nội dung)
    const paymentCode = VietQrPaymentCode.fromOrder(order);
    paymentCode.validateMatches(
      transactionSyncBody.amount,
      transactionSyncBody.content,
    );

    // Bước 3: Sinh mã tham chiếu
    const refTransactionId = `AIMS_TXN_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const transactionRef =
      transactionSyncBody.referencenumber || transactionSyncBody.transactionid;

    // Bước 4: Tạo bản ghi PaymentTransaction và lưu vào database
    const paymentTransaction = this.transactionFactory.createPaymentTransaction(
      order,
      transactionSyncBody,
      transactionRef,
      refTransactionId,
    );
    await this.paymentTransactionRepo.save(paymentTransaction);
    this.logger.log(
      `PaymentTransaction saved: ${paymentTransaction.paymentTransactionId}`,
    );

    // Bước 5: Cập nhật trạng thái đơn hàng → PENDING_PROCESSING (chờ xử lý tiếp theo)
    order.status = 'PENDING_PROCESSING';
    await this.orderRepo.save(order);
    this.logger.log(
      `Order ${order.orderId} status updated to PENDING_PROCESSING`,
    );

    // Bước 6: Gửi email xác nhận kèm hóa đơn và đường link tra cứu cho khách hàng
    if (!paymentTransaction.receiptEmailSentAt) {
      const result = await this.paymentSuccessNotificationControl.sendPaymentSuccessNotification(
        order,
        paymentTransaction,
      );
      if (result.success) {
        paymentTransaction.receiptEmailSentAt = result.sentAt || new Date();
        paymentTransaction.receiptEmailError = null;
      } else {
        paymentTransaction.receiptEmailError = result.error || 'Unknown error';
      }
      await this.paymentTransactionRepo.save(paymentTransaction);
    }

    return { refTransactionId };
  }
}
