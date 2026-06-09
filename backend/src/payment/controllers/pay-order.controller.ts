// File này nhận request từ Frontend và endpoint token callback mà VietQR gọi vào AIMS.
import {
  BadRequestException,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import { PayThroughPaymentGatewayController } from '../services/pay-through-payment-gateway.service.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from '../../order/entities/order.entity.js';
import { Repository } from 'typeorm';
import { VietQRBoundary } from '../../boundaries/viet-qr/viet-qr.service.js';

@Controller()
export class PayOrderController {
  private readonly logger = new Logger(PayOrderController.name);

  constructor(
    private readonly payThroughPaymentGatewayController: PayThroughPaymentGatewayController,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly vietqrService: VietQRBoundary,
  ) {}

  /*
  Endpoint để VietQR lấy Bearer token của AIMS trước khi gọi Transaction Sync.
  Docs: POST https://<your-host>/<your-basepath>/vqr/api/token_generate
  Header: Authorization: Basic Base64[username:password]
  */
  @Post('vqr/api/token_generate')
  token_generate(@Headers('authorization') authHeader: string) {
    const { username, password } = this.parseBasicCredentials(authHeader);
    return this.vietqrService.generateJWTToken(username, password);
  }

  /**
   * Bước 1 trong Sequence Diagram v2: payOrder(order)
   *
   * Customer → PayOrderController: payOrder(order)
   * PayOrderController → PayThroughPaymentGatewayController: generateQRCode(order)
   * → VietQRBoundary: getAccessToken() + generateQRCode(invoice, accessToken)
   * → PaymentScreen: displayQRCode(order, qrCode)
   */
  @Post('api/payment/pay-order/:orderId')
  async payOrder(@Param('orderId') orderId: string) {
    this.logger.log(`Received payOrder request for order: ${orderId}`);

    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return this.payThroughPaymentGatewayController.generateQRCode(order);
  }

  /**
   * Bước 2 trong Sequence Diagram v2: confirmPayment()
   *
   * Luồng hoạt động:
   * 1. Customer bấm "I have paid" (confirmPayment) trên PaymentScreen
   * 2. Frontend gọi POST /api/payment/pay-order/:orderId/confirm
   * 3. PayOrderController gọi confirmPayment(order) trên PayThroughPaymentGatewayController
   * 4. PayThroughPaymentGatewayController gọi handleAPICallback(order) → VietQRBoundary
   * 5. VietQRBoundary gọi API Test Callback (postAPICallback) → VietQR Sandbox
   * 6. VietQR Sandbox tự động gọi Transaction Sync (postAPIToAIMS) → AIMS Backend
   * 7. TransactionSyncController nhận callback → lưu PaymentTransaction + update order status
   * 8. Kết quả trả về cho Frontend → hiển thị SuccessfulPaidScreen
   *
   * @param orderId - ID đơn hàng cần xác nhận thanh toán
   * @returns paymentResult - { status, message, orderId }
   */
  @Post('api/payment/pay-order/:orderId/confirm')
  async confirmPayment(@Param('orderId') orderId: string) {
    this.logger.log(`Received confirmPayment request for order: ${orderId}`);

    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const paymentResult =
      await this.payThroughPaymentGatewayController.confirmPayment(order);
    this.logger.log(
      `Payment result for order ${orderId}: ${JSON.stringify(paymentResult)}`,
    );

    return paymentResult;
  }

  private parseBasicCredentials(authHeader?: string): {
    username: string;
    password: string;
  } {
    if (!authHeader) {
      throw new HttpException(
        { status: 'FAILED', message: 'INVALID_AUTH_HEADER' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const [scheme, base64Credentials] = authHeader.trim().split(/\s+/);
    if (scheme !== 'Basic' || !base64Credentials) {
      throw new HttpException(
        { status: 'FAILED', message: 'INVALID_AUTH_HEADER' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const credentials = Buffer.from(base64Credentials, 'base64').toString(
      'utf-8',
    );
    const separatorIndex = credentials.indexOf(':');
    if (separatorIndex <= 0 || separatorIndex === credentials.length - 1) {
      throw new HttpException(
        { status: 'FAILED', message: 'INVALID_AUTH_HEADER' },
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      username: credentials.substring(0, separatorIndex),
      password: credentials.substring(separatorIndex + 1),
    };
  }
}
