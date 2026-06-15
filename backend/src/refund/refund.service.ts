import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefundTransaction } from './entities/refund-transaction.entity.js';
import { PaymentTransaction } from '../payment/entities/payment-transaction.entity.js';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    @InjectRepository(RefundTransaction)
    private readonly refundTransactionRepo: Repository<RefundTransaction>,
  ) {}

  async createManualRefundForVietQR(
    paymentTransaction: PaymentTransaction,
    reason: string,
  ): Promise<RefundTransaction> {
    this.logger.log(`Creating manual refund requirement for PaymentTransaction ${paymentTransaction.paymentTransactionId}`);

    const refund = this.refundTransactionRepo.create({
      paymentTransaction,
      refundAmount: Number(paymentTransaction.amount),
      refundReason: reason,
      refundDatetime: new Date(),
      refundStatus: 'MANUAL_REQUIRED',
      refundMethod: 'MANUAL_BANK_TRANSFER',
      manualRefundNote: 'VietQR transactions do not support automatic refunds. Product manager must manually transfer money back to the customer.',
    });

    return this.refundTransactionRepo.save(refund);
  }
}
