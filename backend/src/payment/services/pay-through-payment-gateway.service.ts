import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  VietQRBoundary,
  VietQRGenerationResult,
} from '../../boundaries/viet-qr/viet-qr.service.js';
import { Order } from '../../order/entities/order.entity.js';
import { PaymentTransaction } from '../entities/payment-transaction.entity.js';

export interface PaymentConfirmationResponse {
  status: string;
  message: string;
  orderId: string;
  order?: {
    orderId: string;
    status: string;
    customerName: string;
    phoneNumber: string;
    shippingAddress: string;
    province: string;
    totalAmount: number;
    email: string;
  };
  transaction?: {
    transactionId: string;
    paymentTransactionId: string;
    transactionReference: string;
    transactionContent: string;
    transactionDatetime: string;
    amount: number;
    paymentMethod: string;
    status: string;
  };
}

@Injectable()
export class PayThroughPaymentGatewayController {
  private readonly logger = new Logger(PayThroughPaymentGatewayController.name);

  constructor(
    private readonly vietQRBoundary: VietQRBoundary,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async generateQRCode(order: Order): Promise<VietQRGenerationResult> {
    this.logger.log(`Generating QR Code for order ${order.orderId}`);
    return this.vietQRBoundary.generateQRCode(order);
  }

  async confirmPayment(order: Order): Promise<PaymentConfirmationResponse> {
    this.logger.log(`Confirming payment for order ${order.orderId}`);

    const callbackResult = await this.vietQRBoundary.handleAPICallback(order);
    this.logger.log(`API Callback result for order ${order.orderId}: ${JSON.stringify(callbackResult)}`);

    if (callbackResult.status !== 'SUCCESS') {
      return this.buildPaymentConfirmationResponse(
        order,
        null,
        callbackResult.status,
        callbackResult.message,
      );
    }

    const confirmation = await this.waitForSuccessfulPayment(order.orderId, callbackResult.message);
    if (confirmation.transaction) {
      return confirmation;
    }

    return {
      ...confirmation,
      status: 'PENDING_CONFIRMATION',
      message: 'VietQR accepted the payment callback request. Waiting for transaction sync.',
    };
  }

  async getPaymentConfirmation(orderId: string): Promise<PaymentConfirmationResponse> {
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const transaction = await this.findLatestSuccessfulTransaction(orderId);
    if (!transaction) {
      return this.buildPaymentConfirmationResponse(
        order,
        null,
        order.status,
        'Payment transaction has not been recorded yet.',
      );
    }

    if (order.status !== 'PENDING_PROCESSING') {
      order.status = 'PENDING_PROCESSING';
      await this.orderRepo.save(order);
    }

    return this.buildPaymentConfirmationResponse(
      order,
      transaction,
      'SUCCESS',
      'Payment confirmed successfully.',
    );
  }

  private async waitForSuccessfulPayment(
    orderId: string,
    message: string,
  ): Promise<PaymentConfirmationResponse> {
    const maxAttempts = 10;
    const delayMs = 500;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const confirmation = await this.getPaymentConfirmation(orderId);
      if (confirmation.transaction) {
        return {
          ...confirmation,
          message: 'Payment confirmed successfully.',
        };
      }
      await this.delay(delayMs);
    }

    const lastConfirmation = await this.getPaymentConfirmation(orderId);
    return {
      ...lastConfirmation,
      message,
    };
  }

  private async findLatestSuccessfulTransaction(orderId: string): Promise<PaymentTransaction | null> {
    return this.paymentTransactionRepo
      .createQueryBuilder('transaction')
      .innerJoin('transaction.order', 'order')
      .where('order.orderId = :orderId', { orderId })
      .andWhere('transaction.status = :status', { status: 'SUCCESS' })
      .orderBy('transaction.createdAt', 'DESC')
      .getOne();
  }

  private buildPaymentConfirmationResponse(
    order: Order,
    transaction: PaymentTransaction | null,
    status: string,
    message: string,
  ): PaymentConfirmationResponse {
    return {
      status,
      message,
      orderId: order.orderId,
      order: {
        orderId: order.orderId,
        status: order.status,
        customerName: order.deliveryInfo?.name || '',
        phoneNumber: order.deliveryInfo?.phone || '',
        shippingAddress: order.deliveryInfo?.address || '',
        province: order.deliveryInfo?.province || '',
        totalAmount: Number(order.totalAmount),
        email: order.deliveryInfo?.email || '',
      },
      transaction: transaction ? this.buildTransactionSummary(transaction) : undefined,
    };
  }

  private buildTransactionSummary(transaction: PaymentTransaction) {
    const gatewayReference =
      transaction.gatewayTransactionRef || transaction.transactionRef || transaction.paymentTransactionId;

    return {
      transactionId: gatewayReference,
      paymentTransactionId: transaction.paymentTransactionId,
      transactionReference: gatewayReference,
      transactionContent: transaction.transactionContent || '',
      transactionDatetime: this.resolveTransactionDatetime(transaction),
      amount: Number(transaction.amount),
      paymentMethod: transaction.paymentMethod,
      status: transaction.status,
    };
  }

  private resolveTransactionDatetime(transaction: PaymentTransaction): string {
    const rawDatetime = transaction.transactionDatetime ?? transaction.createdAt;

    if (rawDatetime instanceof Date && !Number.isNaN(rawDatetime.getTime())) {
      return rawDatetime.toISOString();
    }

    const parsedDate = new Date(rawDatetime);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }

    return new Date(transaction.createdAt).toISOString();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
