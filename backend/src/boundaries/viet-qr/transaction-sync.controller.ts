/*
 * Đây là endpoint mà VietQR sẽ gọi TỰ ĐỘNG vào hệ thống AIMS sau khi
 * nhận được lệnh Test Callback (postAPICallback). VietQR sẽ POST dữ liệu
 * giao dịch tới endpoint này kèm Bearer token.
 */
import { Controller, Post, Body, Headers, Logger, Res, HttpException, HttpStatus, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction } from '../../payment/entities/payment-transaction.entity.js';
import { Order } from '../../order/entities/order.entity.js';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { PayThroughPaymentGatewayController } from '../../payment/services/pay-through-payment-gateway.service.js';

// ===== Model cho request body =====
/**
 * DTO cho request body từ VietQR Transaction Sync
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

// ===== Lớp model cho success response =====
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

// ===== Lớp model cho error response =====
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

// ===== Lớp model cho object trả về trong success response =====
class TransactionResponseObject {
  reftransactionid: string;

  constructor(reftransactionid: string) {
    this.reftransactionid = reftransactionid;
  }
}

@Controller()
export class TransactionSyncController {
  private readonly logger = new Logger(TransactionSyncController.name);

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly jwtService: JwtService,
    private readonly payThroughPaymentGatewayController: PayThroughPaymentGatewayController,
  ) { }

  /*
  Endpoint de VietQR lay Bearer token cua AIMS truoc khi goi Transaction Sync.
  Docs: POST https://<your-host>/<your-basepath>/vqr/api/token_generate
  Header: Authorization: Basic Base64[username:password]
  */
  @Post('vqr/api/token_generate')
  token_generate(@Headers('authorization') authHeader: string) {
    this.logger.log('Received token_generate request from VietQR');

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new HttpException(
        { error: 'Authorization header is missing or invalid' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    return this.generateJWTToken(username, password);
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

  @Post('vqr/bank/api/transaction-sync') // Hứng request từ VietQR
  async transactionSync(
    @Body() transactionSyncBody: TransactionCallbackDto,
    @Headers('authorization') authHeader: string,
    @Res() res: Response,
  ) {
    this.logger.log('=== VietQR Transaction Sync Received ===');
    this.logger.log(`Callback data: ${JSON.stringify(transactionSyncBody)}`);

    // 1. Valid header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.error('Invalid or missing Authorization header');
      return res.status(401).json(new ErrorResponse(
        true,
        'INVALID_AUTH_HEADER',
        'Authorization header is missing or invalid',
        null,
      ));
    }

    // 2. Valid token
    const token = authHeader.substring('Bearer '.length).trim();
    if (!this.validateCallbackToken(token)) {
      this.logger.error('Invalid or expired Bearer token');
      return res.status(401).json(new ErrorResponse(
        true,
        'INVALID_TOKEN',
        'Invalid or expired token',
        null,
      ));
    }

    try {
      // Bước 1: Tải toàn bộ danh sách đơn hàng và tìm đơn hàng khớp với callback
      const allOrders = await this.orderRepo.find();

      // Tìm order tương ứng với callback
      const order = this.findMatchingOrder(transactionSyncBody, allOrders);
      if (!order) {
        this.logger.warn(`Order not found for orderId: ${transactionSyncBody.orderId}`);
        throw new Error(`Order not found for orderId: ${transactionSyncBody.orderId}`);
      }
      this.logger.log(`Found matching order: ${order.orderId} (status: ${order.status})`);

      // Bước 2: Kiểm tra tính hợp lệ của giao dịch so với đơn hàng (số tiền, nội dung)
      // Validate transaction against order
      this.validateTransactionAgainstOrder(transactionSyncBody, order);

      // Bước 3: Sinh mã tham chiếu
      // refTransactionId: do AIMS tạo, trả về cho VietQR làm biên nhận
      // transactionRef:   do VietQR tạo, lưu lại để đối soát với ngân hàng
      const refTransactionId = `AIMS_TXN_${Date.now()}_${randomUUID().substring(0, 8)}`; // Mã do AIMS tạo
      const transactionRef = transactionSyncBody.referencenumber || transactionSyncBody.transactionid; // Mã do VietQR tạo

      // Bước 4: Tạo bản ghi PaymentTransaction và lưu vào database
      const paymentTransaction = this.buildPaymentTransaction(order, transactionSyncBody, transactionRef, refTransactionId);
      await this.paymentTransactionRepo.save(paymentTransaction);
      this.logger.log(`PaymentTransaction saved: ${paymentTransaction.paymentTransactionId}`);

      // Bước 5: Cập nhật trạng thái đơn hàng → PENDING_PROCESSING (chờ xử lý tiếp theo)
      order.status = 'PENDING_PROCESSING';
      await this.orderRepo.save(order);
      this.logger.log(`Order ${order.orderId} status updated to PENDING_PROCESSING`);

      // Bước 6: Gửi email xác nhận kèm hóa đơn và đường link tra cứu cho khách hàng
      this.simulateSendEmail(order, paymentTransaction);

      // Bước 7: Trả về phản hồi thành công cho VietQR kèm mã biên nhận của AIMS
      this.logger.log('=== Transaction Sync processed successfully ===');
      return res.status(200).json(
        new SuccessResponse(
          false,
          null,
          'Transaction processed successfully',
          new TransactionResponseObject(refTransactionId),
        ),
      );
    } catch (error) {
      // Bắt mọi lỗi phát sinh trong quá trình xử lý và trả về phản hồi lỗi cho VietQR
      const message = error instanceof Error ? error.message : 'Unknown transaction sync error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Transaction Sync processing error: ${message}`, stack);
      return res.status(400).json(new ErrorResponse(true, 'TRANSACTION_FAILED', message, null));
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

  private findMatchingOrder(transactionSyncBody: TransactionCallbackDto, orders: Order[]): Order | null {
    const callbackOrderId = transactionSyncBody.orderId?.trim();
    const callbackContent = transactionSyncBody.content ?? '';

    return (
      orders.find((order) => {
        const shortOrderId = this.getShortOrderId(order);
        const expectedContent = this.getPaymentContent(shortOrderId);
        return (
          order.orderId === callbackOrderId ||
          shortOrderId === callbackOrderId ||
          callbackContent.includes(expectedContent)
        );
      })
      ?? null
    );
  }

  private validateTransactionAgainstOrder(transactionSyncBody: TransactionCallbackDto, order: Order): void {
    const callbackAmount = Math.round(Number(transactionSyncBody.amount));
    const orderAmount = Math.round(Number(order.totalAmount));

    // check if transaction amount is a valid number (not NaN, not Infinity, ...)
    if (!Number.isFinite(callbackAmount)) {
      throw new Error('Invalid transaction amount');
    }

    // check if transaction amount match with order amount
    if (callbackAmount !== orderAmount) {
      throw new Error(`Amount mismatch: expected ${orderAmount}, received ${callbackAmount}`);
    }

    // check if transaction content match with order content
    const expectedContent = this.getPaymentContent(this.getShortOrderId(order));
    if (!transactionSyncBody.content?.includes(expectedContent)) {
      throw new Error(`Content mismatch: expected content to include ${expectedContent}`);
    }
  }

  private getCallbackBankAccount(transactionSyncBody: TransactionCallbackDto): string {
    return transactionSyncBody.bankaccount ?? transactionSyncBody.bankAccount ?? '';
  }

  private getShortOrderId(order: Order): string {
    return order.orderId.replace(/-/g, '').substring(0, 13);
  }

  private getPaymentContent(shortOrderId: string): string {
    return `AIMS ${shortOrderId}`;
  }

  private buildPaymentTransaction(
    order: Order,
    body: TransactionCallbackDto,
    transactionRef: string,
    refTransactionId: string,
  ): PaymentTransaction {
    return this.paymentTransactionRepo.create({
      order,
      transactionRef,
      amount: Number(body.amount),
      paymentMethod: 'VIETQR',
      status: 'SUCCESS',
      paymentDetails: {
        transactionid: body.transactionid,
        transactiontime: body.transactiontime,
        referencenumber: body.referencenumber,
        bankaccount: this.getCallbackBankAccount(body),
        content: body.content,
        transType: body.transType,
        orderId: body.orderId,
        terminalCode: body.terminalCode,
        subTerminalCode: body.subTerminalCode,
        serviceCode: body.serviceCode,
        urlLink: body.urlLink,
        sign: body.sign,
        reftransactionid: refTransactionId,
      },
    });
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
