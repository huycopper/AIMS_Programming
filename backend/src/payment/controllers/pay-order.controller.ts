import { BadRequestException, Controller, Logger, Param, Post } from '@nestjs/common';
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
