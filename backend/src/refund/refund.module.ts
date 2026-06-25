import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefundTransaction } from './entities/refund-transaction.entity.js';
import { RefundService } from './refund.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([RefundTransaction])],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
