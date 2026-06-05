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

import { Controller, Post, Body, Headers, Logger, HttpCode, HttpException, HttpStatus, Res } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction } from '../../payment/entities/payment-transaction.entity.js';
import { Order } from '../../order/entities/order.entity.js';
import type { Response } from 'express';
// import * as jwt from 'jsonwebtoken';
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
  transactionid: string;     // ID của giao dịch (Required)
  transactiontime: number;   // Thời gian giao dịch timestamp ms (Required)
  referencenumber: string;   // Mã giao dịch (Required)
  amount: number;            // Số tiền giao dịch (Required)
  content: string;           // Nội dung chuyển tiền (Required)
  bankaccount: string;       // Tài khoản ngân hàng tạo mã thanh toán (Required)
  orderId: string;           // Mã đơn hàng (Required)
  sign?: string;             // Chữ ký (Optional)
  terminalCode?: string;     // Mã cửa hàng/điểm bán (Optional)
  urlLink?: string;          // Link điều hướng sau thanh toán (Optional)
  serviceCode?: string;      // Mã sản phẩm/dịch vụ (Optional)
  subTerminalCode?: string;  // Mã cửa hàng phụ (Optional)
  transType?: string;        // Phân loại giao dịch: D (ghi nợ) / C (ghi có)
}

// ===== Lớp model cho success response (tương ứng class SuccessResponse trong code mẫu) =====
class SuccessResponse {
  error: boolean;
  errorReason: string | null;
  toastMessage: string;
  object: TransactionResponseObject;

  constructor(error: boolean, errorReason: string | null, toastMessage: string, object: TransactionResponseObject) {
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

  constructor(error: boolean, errorReason: string, toastMessage: string, object: null) {
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
  ) { }

  @Post('transaction-sync')
  async transactionSync(
    @Body() transactionCallback: TransactionCallbackDto,
    @Headers('authorization') authHeader: string,
    @Res() res: Response,
  ) {
    this.logger.log('=== VietQR Transaction Sync Received ===');
    this.logger.log(`Callback data: ${JSON.stringify(transactionCallback)}`);

    // ===== Bước 1: Lấy token từ header Authorization =====
    if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
      this.logger.error('Invalid or missing Authorization header');
      return res.status(401).json(
        new ErrorResponse(true, 'INVALID_AUTH_HEADER', 'Authorization header is missing or invalid', null)
      );
    }

    // ===== Bước 2: Trích xuất token =====
    const token = authHeader.substring(BEARER_PREFIX.length).trim();

    // Không cần xác thực token vì không dùng JWT trong môi trường sandbox
    // if (!validateToken(token)) {
    //   this.logger.error('Invalid or expired token');
    //   return res.status(401).json(
    //     new ErrorResponse(true, 'INVALID_TOKEN', 'Invalid or expired token', null)
    //   );
    // }

    // ===== Bước 3: Xử lý nghiệp vụ (trong try/catch) =====

    try {
      // Tìm order theo orderId từ callback
      // VietQR trả về orderId đã được cắt ngắn (shortOrderId), nên cần tìm order
      // bằng cách so sánh prefix
      let order: Order | null = null;

      if (transactionCallback.orderId) {
        const allOrders = await this.orderRepo.find();
        order = allOrders.find((o) => {
          const shortId = o.orderId.replace(/-/g, '').substring(0, 13);
          return shortId === transactionCallback.orderId;
        }) || null;
      }

      // Nếu không tìm thấy order qua orderId, thử tìm qua content
      if (!order && transactionCallback.content) {
        const allOrders = await this.orderRepo.find();
        order = allOrders.find((o) => {
          const shortId = o.orderId.replace(/-/g, '').substring(0, 13);
          const expectedContent = `AIMS ${shortId}`;
          return transactionCallback.content.includes(expectedContent);
        }) || null;
      }

      if (!order) {
        this.logger.warn(`Order not found for orderId: ${transactionCallback.orderId}`);
        throw new Error(`Order not found for orderId: ${transactionCallback.orderId}`);
      }

      this.logger.log(`Found matching order: ${order.orderId} (status: ${order.status})`);

      // Tạo referenceTransactionId (mã giao dịch nội bộ AIMS)
      // Tương ứng code mẫu: const refTransactionId = "GeneratedRefTransactionId";
      const refTransactionId = `AIMS_TXN_${Date.now()}_${randomUUID().substring(0, 8)}`;

      // Lưu PaymentTransaction vào database
      const paymentTransaction = this.paymentTransactionRepo.create({
        order: order,
        transactionRef: transactionCallback.referencenumber || transactionCallback.transactionid,
        amount: transactionCallback.amount,
        paymentMethod: 'VIETQR',
        status: 'SUCCESS',
        paymentDetails: {
          transactionid: transactionCallback.transactionid,
          transactiontime: transactionCallback.transactiontime,
          referencenumber: transactionCallback.referencenumber,
          bankaccount: transactionCallback.bankaccount,
          content: transactionCallback.content,
          transType: transactionCallback.transType,
          reftransactionid: refTransactionId,
        },
      });

      await this.paymentTransactionRepo.save(paymentTransaction);
      this.logger.log(`PaymentTransaction saved: ${paymentTransaction.paymentTransactionId}`);

      // Cập nhật order status thành PENDING_PROCESSING (theo Business Rule)
      order.status = 'PENDING_PROCESSING';
      await this.orderRepo.save(order);
      this.logger.log(`Order ${order.orderId} status updated to PENDING_PROCESSING`);

      // Simulate sending email (theo Business Rule)
      this.simulateSendEmail(order, paymentTransaction);

      // Trả về response 200 OK với thông tin giao dịch
      // Tương ứng code mẫu:
      //   return res.status(200).json(new SuccessResponse(false, null, "Transaction processed successfully", new TransactionResponseObject(refTransactionId)));
      this.logger.log('=== Transaction Sync processed successfully ===');
      return res.status(200).json(
        new SuccessResponse(false, null, 'Transaction processed successfully', new TransactionResponseObject(refTransactionId))
      );

    } catch (error) {
      // Trả về lỗi trong trường hợp có exception
      // Tương ứng code mẫu:
      //   return res.status(400).json(new ErrorResponse(true, "TRANSACTION_FAILED", error.message, null));
      this.logger.error(`Transaction Sync processing error: ${error.message}`, error.stack);
      return res.status(400).json(
        new ErrorResponse(true, 'TRANSACTION_FAILED', error.message, null)
      );
    }
  }

  /**
   * Simulate sending email to customer
   * Theo Business Rule: Hiển thị màn hình thành công và gửi email tự động
   * chứa hóa đơn (invoice), thông tin giao dịch kèm đường link
   */
  private simulateSendEmail(order: Order, transaction: PaymentTransaction): void {
    this.logger.log(`[EMAIL SIMULATION] Sending email to customer for Order ${order.orderId}`);
    this.logger.log(`[EMAIL SIMULATION] Invoice & Transaction ${transaction.transactionRef} sent.`);
    this.logger.log(`[EMAIL SIMULATION] Tracking link: http://localhost:4200/track/${order.orderId}`);
    this.logger.log(`[EMAIL SIMULATION] Cancel link: http://localhost:4200/cancel/${order.orderId}`);
  }
}
