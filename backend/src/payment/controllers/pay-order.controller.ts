import { BadRequestException, Controller, Headers, HttpException, HttpStatus, Logger, Param, Post } from '@nestjs/common';
import { PayThroughPaymentGatewayController } from '../services/pay-through-payment-gateway.service.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from '../../order/entities/order.entity.js';
import { Repository } from 'typeorm';

@Controller()
export class PayOrderBoundary {
  private readonly logger = new Logger(PayOrderBoundary.name);

  constructor(
    private readonly payThroughPaymentGatewayController: PayThroughPaymentGatewayController,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) { }

  /*
  Endpoint để VietQR lấy Bearer token của AIMS trước khi gọi Transaction Sync.
  Docs: POST https://<your-host>/<your-basepath>/vqr/api/token_generate
  Header: Authorization: Basic Base64[username:password]
  */
  @Post('vqr/api/token_generate')
  token_generate(@Headers('authorization') authHeader: string) {
    this.logger.log(`Received token_generate request from VietQR`);
    /*
      - @Headers(): decorator dùng để trích xuất thông tin từ HTTP Headers.
      - 'authorization': tên của header cần lấy giá trị (ví dụ: 'Content-Type', 'User-Agent').
      - authHeader: tên biến sẽ được gán giá trị của header 'authorization'.
    */

    // Kiểm tra Authorization header
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new HttpException(
        { error: 'Authorization header is missing or invalid' },
        HttpStatus.BAD_REQUEST
      );
    }

    // Giải mã Base64 từ Authorization header
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    return this.payThroughPaymentGatewayController.generateJWTToken(username, password);
  }

  // Endpoint để hứng request từ Frontend để generate QR Code
  @Post('api/payment/pay-order/:orderId')
  async payOrder(@Param('orderId') orderId: string) {
    this.logger.log(`Received payOrder request for order: ${orderId}`);

    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return this.payThroughPaymentGatewayController.generateQRCode(order);
  }

  // Endpoint để hứng request từ Frontend để xác nhận đã thanh toán
  @Post('api/payment/pay-order/:orderId/confirm')
  async confirmPayment(@Param('orderId') orderId: string) {
    this.logger.log(`Received confirmPayment request for order: ${orderId}`);

    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const paymentResult = await this.payThroughPaymentGatewayController.confirmPayment(order);

    this.logger.log(`Payment result for order ${orderId}: ${JSON.stringify(paymentResult)}`);
    return paymentResult;
  }
}
