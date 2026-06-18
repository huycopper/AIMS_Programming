import { Module } from '@nestjs/common';
import { PayByVietQrModule } from '../pay-order/pay-by-vietqr/pay-by-vietqr.module.js';

@Module({
  imports: [
    PayByVietQrModule,
  ],
})
export class PaymentModule { }

