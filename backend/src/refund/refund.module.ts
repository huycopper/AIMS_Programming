import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { RefundTransaction } from './entities/refund-transaction.entity.js';
import { RefundService } from './refund.service.js';
import { PayPalRefundBoundary } from './paypal-refund.boundary.js';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([RefundTransaction])],
  providers: [RefundService, PayPalRefundBoundary],
  exports: [RefundService],
})
export class RefundModule {}
