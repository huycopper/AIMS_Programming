import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PayThroughVietQrService } from '../../controllers/pay-through-viet-qr/pay-through-viet-qr.service.js';

@Controller('api/viet-qr-webhook')
export class VietQrWebhookController {
  constructor(private readonly payThroughVietQrService: PayThroughVietQrService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: any) {
    return this.payThroughVietQrService.handleCallback(payload);
  }
}
