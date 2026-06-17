import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  TransactionSyncDto,
  TransactionSyncResult,
  VietQRResponseBody,
} from '../dto/transaction-sync.dto.js';
import { Order } from '../../order/entities/order.entity.js';
import { PaymentTransaction } from '../entities/payment-transaction.entity.js';
import { NotificationService } from '../../notification/notification.service.js';

@Injectable()
export class TransactionSyncService {
  private readonly logger = new Logger(TransactionSyncService.name);

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
  ) {}

  async handleTransactionSync(
    payload: unknown,
    authHeader?: string,
  ): Promise<TransactionSyncResult> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return this.error(401, 'INVALID_AUTH_HEADER', 'Authorization header is missing or invalid');
    }

    const token = authHeader.substring('Bearer '.length).trim();
    if (!this.validateCallbackToken(token)) {
      return this.error(401, 'INVALID_TOKEN', 'Invalid or expired token');
    }

    const dto = plainToInstance(TransactionSyncDto, payload);
    const validationErrors = validateSync(dto, {
      whitelist: true,
      forbidUnknownValues: true,
    });
    if (validationErrors.length > 0) {
      return this.error(400, 'VALIDATION_FAILED', 'Missing or invalid Transaction Sync fields');
    }

    const existingTransaction = await this.findExistingSuccessfulTransaction(dto);
    if (existingTransaction) {
      return this.success(existingTransaction.paymentTransactionId);
    }

    const order = await this.findOrderForCallback(dto);
    if (!order) {
      return this.error(400, 'ORDER_NOT_FOUND', `Order not found for orderId: ${dto.orderId}`);
    }

    const validationResult = this.validateTransactionAgainstOrder(dto, order);
    if (validationResult) {
      return validationResult;
    }

    const refTransactionId = `AIMS_TXN_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const paymentTransaction = this.paymentTransactionRepo.create({
      order,
      amount: Number(dto.amount),
      paymentMethod: 'QR_CODE',
      status: 'SUCCESS',
      transactionContent: dto.content,
      transactionDatetime: new Date(Number(dto.transactiontime)),
      gatewayTransactionRef: dto.referencenumber || dto.transactionid,
      errorCode: null,
    });

    const savedTransaction = await this.paymentTransactionRepo.save(paymentTransaction);

    if (order.status !== 'PENDING_PROCESSING') {
      order.status = 'PENDING_PROCESSING';
      await this.orderRepo.save(order);
    }

    try {
      await this.notificationService.sendPaymentSuccessNotification(order, savedTransaction);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown email error';
      this.logger.error(`Failed to send payment success email for order ${order.orderId}: ${message}`);
    }

    return this.success(refTransactionId);
  }

  private validateCallbackToken(token: string): boolean {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      this.logger.error('JWT_SECRET is not configured');
      return false;
    }

    try {
      this.jwtService.verify(token, { secret: jwtSecret });
      return true;
    } catch {
      return false;
    }
  }

  private async findExistingSuccessfulTransaction(
    dto: TransactionSyncDto,
  ): Promise<PaymentTransaction | null> {
    return this.paymentTransactionRepo.findOne({
      where: [
        { gatewayTransactionRef: dto.referencenumber, status: 'SUCCESS' },
        { gatewayTransactionRef: dto.transactionid, status: 'SUCCESS' },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  private async findOrderForCallback(dto: TransactionSyncDto): Promise<Order | null> {
    const callbackOrderId = dto.orderId.trim();

    return this.orderRepo
      .createQueryBuilder('order')
      .where('order.orderId = :orderId', { orderId: callbackOrderId })
      .orWhere("SUBSTRING(REPLACE(order.orderId, '-', ''), 1, 13) = :shortOrderId", {
        shortOrderId: callbackOrderId,
      })
      .getOne();
  }

  private validateTransactionAgainstOrder(
    dto: TransactionSyncDto,
    order: Order,
  ): TransactionSyncResult | null {
    const callbackAmount = Math.round(Number(dto.amount));
    const orderAmount = Math.round(Number(order.totalAmount));

    if (!Number.isFinite(callbackAmount)) {
      return this.error(400, 'INVALID_AMOUNT', 'Invalid transaction amount');
    }

    if (callbackAmount !== orderAmount) {
      return this.error(
        400,
        'AMOUNT_MISMATCH',
        `Amount mismatch: expected ${orderAmount}, received ${callbackAmount}`,
      );
    }

    const expectedContent = this.getPaymentContent(this.getShortOrderId(order));
    if (!dto.content.includes(expectedContent)) {
      return this.error(
        400,
        'CONTENT_MISMATCH',
        `Content mismatch: expected content to include ${expectedContent}`,
      );
    }

    return null;
  }

  private getShortOrderId(order: Order): string {
    return order.orderId.replace(/-/g, '').substring(0, 13);
  }

  private getPaymentContent(shortOrderId: string): string {
    return `AIMS ${shortOrderId}`;
  }

  private success(refTransactionId: string): TransactionSyncResult {
    return {
      statusCode: 200,
      body: {
        error: false,
        errorReason: null,
        toastMessage: 'Transaction processed successfully',
        object: { reftransactionid: refTransactionId },
      },
    };
  }

  private error(
    statusCode: number,
    errorReason: string,
    toastMessage: string,
  ): TransactionSyncResult {
    const body: VietQRResponseBody = {
      error: true,
      errorReason,
      toastMessage,
      object: null,
    };

    return { statusCode, body };
  }
}
