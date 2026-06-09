/**
 * Transaction Sync Controller (VietQR Callback Receiver)
 *
 * Bước 2.1.1.1.1.1 trong Sequence Diagram v2: postAPIToAIMS()
 *
 * Đây là endpoint mà VietQR sẽ gọi TỰ ĐỘNG vào hệ thống AIMS sau khi
 * nhận được lệnh Test Callback (postAPICallback). VietQR sẽ POST dữ liệu
 * giao dịch tới endpoint này kèm Bearer token.
 *
 */

import { Controller, Post, Body, Headers, Logger, Res } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction } from '../../payment/entities/payment-transaction.entity.js';
import { Order } from '../../order/entities/order.entity.js';
import type { Response } from 'express';
import { randomUUID } from 'crypto';

// ===== Các hằng số (tương ứng code mẫu NodeJS) =====
// const SECRET_KEY = 'your-256-bit-secret'; // Secret key để kiểm tra JWT (giống code mẫu)
const BEARER_PREFIX = 'Bearer '; // Prefix của Authorization header

// ===== Model cho request body (tương ứng class TransactionCallback trong code mẫu) =====
/**
 * DTO cho request body từ VietQR Transaction Sync
 * Chuyển đổi từ class TransactionCallback trong code mẫu NodeJS
 * Theo tài liệu 2-APITransactionSync.md
 */
export class TransactionCallbackDto {
  transactionid: string; // ID của giao dịch (Required)
  transactiontime: number; // Thời gian giao dịch timestamp ms (Required)
  referencenumber: string; // Mã giao dịch (Required)
  amount: number; // Số tiền giao dịch (Required)
  content: string; // Nội dung chuyển tiền (Required)
  bankaccount: string; // Tài khoản ngân hàng tạo mã thanh toán (Required)
  bankAccount?: string; // Fallback nếu sandbox gửi camelCase
  orderId?: string; // Sandbox có thể gửi rỗng; fallback theo content
  sign?: string; // Chữ ký (Optional)
  terminalCode?: string; // Mã cửa hàng/điểm bán (Optional)
  urlLink?: string; // Link điều hướng sau thanh toán (Optional)
  serviceCode?: string; // Mã sản phẩm/dịch vụ (Optional)
  subTerminalCode?: string; // Mã cửa hàng phụ (Optional)
  transType?: string; // Phân loại giao dịch: D (ghi nợ) / C (ghi có)
}

// ===== Lớp model cho success response (tương ứng class SuccessResponse trong code mẫu) =====
class SuccessResponse {
  error: boolean;
  errorReason: string | null;
  toastMessage: string;
  object: TransactionResponseObject;

  constructor(
    error: boolean,
    errorReason: string | null,
    toastMessage: string,
    object: TransactionResponseObject,
  ) {
    this.error = error;
    this.errorReason = errorReason;
    this.toastMessage = toastMessage;
    this.object = object;
  }
}

// ===== Lớp model cho lỗi response (tương ứng class ErrorResponse trong code mẫu) =====
class ErrorResponse {
  error: boolean;
  errorReason: string;
  toastMessage: string;
  object: null;

  constructor(
    error: boolean,
    errorReason: string,
    toastMessage: string,
    object: null,
  ) {
    this.error = error;
    this.errorReason = errorReason;
    this.toastMessage = toastMessage;
    this.object = object;
  }
}

// ===== Lớp model cho object trả về trong success response (tương ứng class TransactionResponseObject) =====
class TransactionResponseObject {
  reftransactionid: string;

  constructor(reftransactionid: string) {
    this.reftransactionid = reftransactionid;
  }
}

@Controller('vqr/bank/api')
export class TransactionSyncController {
  private readonly logger = new Logger(TransactionSyncController.name);

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly jwtService: JwtService,
  ) { }

  @Post('transaction-sync')
  async transactionSync(
    @Body() transactionCallback: TransactionCallbackDto,
    @Headers('authorization') authHeader: string,
    @Res() res: Response,
  ) {
    this.logger.log('=== VietQR Transaction Sync Received ===');
    this.logger.log(`Callback data: ${JSON.stringify(transactionCallback)}`);

    if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
      this.logger.error('Invalid or missing Authorization header');
      return res
        .status(401)
        .json(
          new ErrorResponse(
            true,
            'INVALID_AUTH_HEADER',
            'Authorization header is missing or invalid',
            null,
          ),
        );
    }

    const token = authHeader.substring(BEARER_PREFIX.length).trim();
    if (!this.validateCallbackToken(token)) {
      this.logger.error('Invalid or expired Bearer token');
      return res
        .status(401)
        .json(
          new ErrorResponse(
            true,
            'INVALID_TOKEN',
            'Invalid or expired token',
            null,
          ),
        );
    }

    try {
      const missingFields = this.getMissingRequiredFields(transactionCallback);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      const allOrders = await this.orderRepo.find();
      const order = this.findMatchingOrder(transactionCallback, allOrders);
      if (!order) {
        this.logger.warn(
          `Order not found for orderId: ${transactionCallback.orderId}`,
        );
        throw new Error(
          `Order not found for orderId: ${transactionCallback.orderId}`,
        );
      }

      this.logger.log(
        `Found matching order: ${order.orderId} (status: ${order.status})`,
      );

      this.validateTransactionAgainstOrder(transactionCallback, order);

      const refTransactionId = `AIMS_TXN_${Date.now()}_${randomUUID().substring(0, 8)}`;
      const transactionRef =
        transactionCallback.referencenumber ||
        transactionCallback.transactionid;

      const existingTransaction = await this.paymentTransactionRepo.findOne({
        where: { transactionRef },
      });

      if (existingTransaction) {
        order.status = 'PENDING_PROCESSING';
        await this.orderRepo.save(order);

        const existingRefTransactionId =
          existingTransaction.paymentDetails?.reftransactionid ??
          existingTransaction.paymentTransactionId;

        this.logger.log(
          `Duplicate Transaction Sync ignored: ${transactionRef}`,
        );
        return res
          .status(200)
          .json(
            new SuccessResponse(
              false,
              null,
              'Transaction already processed',
              new TransactionResponseObject(existingRefTransactionId),
            ),
          );
      }

      const paymentTransaction = this.paymentTransactionRepo.create({
        order,
        transactionRef,
        amount: Number(transactionCallback.amount),
        paymentMethod: 'VIETQR',
        status: 'SUCCESS',
        paymentDetails: {
          transactionid: transactionCallback.transactionid,
          transactiontime: transactionCallback.transactiontime,
          referencenumber: transactionCallback.referencenumber,
          bankaccount: this.getCallbackBankAccount(transactionCallback),
          content: transactionCallback.content,
          transType: transactionCallback.transType,
          orderId: transactionCallback.orderId,
          terminalCode: transactionCallback.terminalCode,
          subTerminalCode: transactionCallback.subTerminalCode,
          serviceCode: transactionCallback.serviceCode,
          urlLink: transactionCallback.urlLink,
          sign: transactionCallback.sign,
          reftransactionid: refTransactionId,
        },
      });

      await this.paymentTransactionRepo.save(paymentTransaction);
      this.logger.log(
        `PaymentTransaction saved: ${paymentTransaction.paymentTransactionId}`,
      );

      order.status = 'PENDING_PROCESSING';
      await this.orderRepo.save(order);
      this.logger.log(
        `Order ${order.orderId} status updated to PENDING_PROCESSING`,
      );

      this.simulateSendEmail(order, paymentTransaction);

      this.logger.log('=== Transaction Sync processed successfully ===');
      return res
        .status(200)
        .json(
          new SuccessResponse(
            false,
            null,
            'Transaction processed successfully',
            new TransactionResponseObject(refTransactionId),
          ),
        );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown transaction sync error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Transaction Sync processing error: ${message}`, stack);
      return res
        .status(400)
        .json(new ErrorResponse(true, 'TRANSACTION_FAILED', message, null));
    }
  }

  private validateCallbackToken(token: string): boolean {
    if (!process.env.JWT_SECRET) {
      this.logger.error('JWT_SECRET is not configured');
      return false;
    }

    try {
      this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      return true;
    } catch {
      return false;
    }
  }

  private getMissingRequiredFields(
    transactionCallback: TransactionCallbackDto,
  ): string[] {
    const requiredFields = {
      bankaccount: this.getCallbackBankAccount(transactionCallback),
      amount: transactionCallback.amount,
      transType: transactionCallback.transType,
      content: transactionCallback.content,
      transactionid: transactionCallback.transactionid,
      transactiontime: transactionCallback.transactiontime,
      referencenumber: transactionCallback.referencenumber,
    };

    return Object.entries(requiredFields)
      .filter(
        ([, value]) => value === undefined || value === null || value === '',
      )
      .map(([field]) => field);
  }

  private findMatchingOrder(
    transactionCallback: TransactionCallbackDto,
    orders: Order[],
  ): Order | null {
    const callbackOrderId = transactionCallback.orderId?.trim();
    const callbackContent = transactionCallback.content ?? '';

    return (
      orders.find((order) => {
        const shortOrderId = this.getShortOrderId(order);
        const expectedContent = this.getPaymentContent(shortOrderId);

        return (
          order.orderId === callbackOrderId ||
          shortOrderId === callbackOrderId ||
          callbackContent.includes(expectedContent)
        );
      }) ?? null
    );
  }

  private validateTransactionAgainstOrder(
    transactionCallback: TransactionCallbackDto,
    order: Order,
  ): void {
    const callbackAmount = Math.round(Number(transactionCallback.amount));
    const orderAmount = Math.round(Number(order.totalAmount));

    if (!Number.isFinite(callbackAmount)) {
      throw new Error('Invalid transaction amount');
    }

    if (callbackAmount !== orderAmount) {
      throw new Error(
        `Amount mismatch: expected ${orderAmount}, received ${callbackAmount}`,
      );
    }

    if (transactionCallback.transType !== 'C') {
      throw new Error(
        `Invalid transType: expected C, received ${transactionCallback.transType}`,
      );
    }

    const expectedContent = this.getPaymentContent(this.getShortOrderId(order));
    if (!transactionCallback.content?.includes(expectedContent)) {
      throw new Error(
        `Content mismatch: expected content to include ${expectedContent}`,
      );
    }
  }

  private getCallbackBankAccount(
    transactionCallback: TransactionCallbackDto,
  ): string {
    return (
      transactionCallback.bankaccount ?? transactionCallback.bankAccount ?? ''
    );
  }

  private getShortOrderId(order: Order): string {
    return order.orderId.replace(/-/g, '').substring(0, 13);
  }

  private getPaymentContent(shortOrderId: string): string {
    return `AIMS ${shortOrderId}`;
  }

  /**
   * Simulate sending email to customer
   * Theo Business Rule: Hiển thị màn hình thành công và gửi email tự động
   * chứa hóa đơn (invoice), thông tin giao dịch kèm đường link
   */
  private simulateSendEmail(
    order: Order,
    transaction: PaymentTransaction,
  ): void {
    this.logger.log(
      `[EMAIL SIMULATION] Sending email to customer for Order ${order.orderId}`,
    );
    this.logger.log(
      `[EMAIL SIMULATION] Invoice & Transaction ${transaction.transactionRef} sent.`,
    );
    this.logger.log(
      `[EMAIL SIMULATION] Tracking link: http://localhost:4200/track/${order.orderId}`,
    );
    this.logger.log(
      `[EMAIL SIMULATION] Cancel link: http://localhost:4200/cancel/${order.orderId}`,
    );
  }
}
