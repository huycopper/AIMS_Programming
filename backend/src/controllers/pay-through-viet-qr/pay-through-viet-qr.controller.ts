import { Controller, Post, Body } from '@nestjs/common';
import { PayThroughVietQrService } from './pay-through-viet-qr.service.js';

@Controller('api/pay-vietqr')
export class PayThroughVietQrController {
  constructor(private readonly payThroughVietQrService: PayThroughVietQrService) {}

  @Post('process-payment')
  async processPayment(@Body() invoiceData: any) {
    return this.payThroughVietQrService.processPayment(invoiceData);
  }
}
