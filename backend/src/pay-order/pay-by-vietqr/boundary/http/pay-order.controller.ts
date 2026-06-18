import { BadRequestException, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PayThroughVietQRController } from '../../control/pay-through-vietqr.controller.js';
import { Order } from '../../../../order/entities/order.entity.js';
import { GenerateVietQrPaymentResponse } from './dto/generate-vietqr-payment.response.js';
import { PaymentConfirmationResponse } from './dto/payment-confirmation.response.js';

@Controller()
export class PayOrderController {
  private readonly logger = new Logger(PayOrderController.name);

  constructor(
    private readonly payThroughVietQRController: PayThroughVietQRController,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) { }

  @Post('api/payment/pay-order/:orderId')
  async payOrder(@Param('orderId') orderId: string): Promise<GenerateVietQrPaymentResponse> {
    this.logger.log(`Received payOrder request for order: ${orderId}`);

    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    return this.payThroughVietQRController.generateQRCode(order);
  }

  @Post('api/payment/pay-order/:orderId/confirm')
  async confirmPayment(@Param('orderId') orderId: string): Promise<PaymentConfirmationResponse> {
    this.logger.log(`Received confirmPayment request for order: ${orderId}`);

    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const paymentResult = await this.payThroughVietQRController.confirmPayment(order);

    this.logger.log(`Payment result for order ${orderId}: ${JSON.stringify(paymentResult)}`);
    return paymentResult;
  }

  @Get('api/payment/pay-order/:orderId/confirmation')
  async getPaymentConfirmation(@Param('orderId') orderId: string): Promise<PaymentConfirmationResponse> {
    this.logger.log(`Received payment confirmation status request for order: ${orderId}`);
    return this.payThroughVietQRController.getPaymentConfirmation(orderId);
  }
}
