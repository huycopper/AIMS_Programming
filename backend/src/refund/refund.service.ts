import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { RefundTransaction } from './entities/refund-transaction.entity.js';
import { PaymentTransaction } from '../payment/entities/payment-transaction.entity.js';
import { PayPalRefundBoundary } from './paypal-refund.boundary.js';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    @InjectRepository(RefundTransaction)
    private readonly refundTransactionRepo: Repository<RefundTransaction>,
    private readonly paypalRefundBoundary: PayPalRefundBoundary,
  ) {}

  async createManualRefundForVietQR(
    paymentTransaction: PaymentTransaction,
    reason: string,
    manager?: EntityManager,
  ): Promise<RefundTransaction> {
    const existing = await this.getRefundByPaymentTransaction(
      paymentTransaction.paymentTransactionId,
      manager,
    );
    if (existing) {
      return existing;
    }

    this.logger.log(
      `Creating manual refund requirement for PaymentTransaction ${paymentTransaction.paymentTransactionId}`,
    );

    const repo = this.getRepo(manager);
    const refund = repo.create({
      paymentTransaction,
      refundAmount: Number(paymentTransaction.amount),
      refundReason: reason,
      refundDatetime: new Date(),
      refundStatus: 'MANUAL_REQUIRED',
      refundMethod: 'MANUAL_BANK_TRANSFER',
      manualRefundNote:
        'VietQR transactions do not support automatic refunds. Product manager must manually transfer money back to the customer.',
    });

    return repo.save(refund);
  }

  async createPaypalRefund(
    paymentTransaction: PaymentTransaction,
    reason: string,
    manager?: EntityManager,
  ): Promise<RefundTransaction> {
    const existing = await this.getRefundByPaymentTransaction(
      paymentTransaction.paymentTransactionId,
      manager,
    );
    if (existing) {
      return existing;
    }

    const gatewayResult =
      await this.paypalRefundBoundary.refundPayment(paymentTransaction);
    const repo = this.getRepo(manager);
    const refund = repo.create({
      paymentTransaction,
      refundAmount: Number(paymentTransaction.amount),
      refundReason: reason,
      refundDatetime: new Date(),
      refundStatus: gatewayResult.status,
      refundMethod: 'PAYPAL_API',
      manualRefundNote: gatewayResult.message || null,
    });

    return repo.save(refund);
  }

  async getRefundByPaymentTransaction(
    paymentTransactionId: string,
    manager?: EntityManager,
  ): Promise<RefundTransaction | null> {
    return this.getRepo(manager).findOne({
      where: { paymentTransaction: { paymentTransactionId } },
    });
  }

  private getRepo(manager?: EntityManager): Repository<RefundTransaction> {
    return manager
      ? manager.getRepository(RefundTransaction)
      : this.refundTransactionRepo;
  }
}
