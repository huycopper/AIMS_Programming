import { Controller, Post, Body, Logger } from '@nestjs/common';
import { VietQRBoundary } from './viet-qr.service.js';
import { PayThroughPaymentGatewayController } from '../../payment/services/pay-through-payment-gateway.service.js';

@Controller('api/vietqr/webhook')
export class VietQRWebhookBoundary {
  private readonly logger = new Logger(VietQRWebhookBoundary.name);

  constructor(
    private readonly paymentGatewayController: PayThroughPaymentGatewayController,
  ) {}

  @Post()
  async paymentCallback(@Body() transactionResult: any) {
    this.logger.log('Received VietQR Webhook:', transactionResult);
    // Forward to PayThroughPaymentGatewayController as per BCE sequence diagram
    await this.paymentGatewayController.handlePaymentCallback(transactionResult);
    return { status: 'success' };
  }
}
