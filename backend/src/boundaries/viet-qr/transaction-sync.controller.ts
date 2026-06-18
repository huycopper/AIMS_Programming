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
import { PayThroughVietQRController } from '../../pay-order/pay-by-vietqr/control/pay-through-vietqr.controller.js';
import { NotificationService } from '../../notification/notification.service.js';
import { TransactionCallbackDto } from '../../pay-order/pay-by-vietqr/entity/vietqr-transaction-sync.dto.js';
import { SuccessResponse, ErrorResponse, TransactionResponseObject } from '../../pay-order/pay-by-vietqr/boundary/webhook/dto/vietqr-transaction-sync.response.js';
import { VietQrPaymentCode } from '../../pay-order/pay-by-vietqr/entity/vietqr-payment-code.vo.js';

@Controller()
export class TransactionSyncController {
  private readonly logger = new Logger(TransactionSyncController.name);

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly jwtService: JwtService,
    private readonly payThroughVietQRController: PayThroughVietQRController,
    private readonly notificationService: NotificationService,
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
      if (!paymentTransaction.receiptEmailSentAt) {
        try {
          await this.notificationService.sendPaymentSuccessNotification(order, paymentTransaction);
          paymentTransaction.receiptEmailSentAt = new Date();
          paymentTransaction.receiptEmailError = null;
          await this.paymentTransactionRepo.save(paymentTransaction);
        } catch (emailError) {
          this.logger.error(`Failed to send receipt email for order ${order.orderId}`, emailError.stack);
          paymentTransaction.receiptEmailError = emailError.message;
          await this.paymentTransactionRepo.save(paymentTransaction);
        }
      }

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
    return (
      orders.find((order) => {
        const paymentCode = VietQrPaymentCode.fromOrder(order);
        return paymentCode.matchesCallback(
          transactionSyncBody.orderId,
          transactionSyncBody.content,
          order.orderId,
        );
      })
      ?? null
    );
  }

  private validateTransactionAgainstOrder(transactionSyncBody: TransactionCallbackDto, order: Order): void {
    const paymentCode = VietQrPaymentCode.fromOrder(order);
    paymentCode.validateMatches(transactionSyncBody.amount, transactionSyncBody.content);
  }

  private getCallbackBankAccount(transactionSyncBody: TransactionCallbackDto): string {
    return transactionSyncBody.bankaccount ?? transactionSyncBody.bankAccount ?? '';
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
}
