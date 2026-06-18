import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../../order/entities/order.entity.js';
import { TransactionCallbackDto } from '../entity/vietqr-transaction-sync.dto.js';
import { VietQrPaymentCode } from '../entity/vietqr-payment-code.vo.js';

@Injectable()
export class VietQrOrderMatcherControl {
  private readonly logger = new Logger(VietQrOrderMatcherControl.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async matchOrder(transactionSyncBody: TransactionCallbackDto): Promise<Order | null> {
    const allOrders = await this.orderRepo.find();
    return this.findMatchingOrder(transactionSyncBody, allOrders);
  }

  private findMatchingOrder(transactionSyncBody: TransactionCallbackDto, orders: Order[]): Order | null {
    return (
      orders.find((order) => {
        const paymentCode = VietQrPaymentCode.fromOrder(order);
        return paymentCode.matchesCallback(
          transactionSyncBody.orderId,
          transactionSyncBody.content,
          order.orderId,
        );
      })
      ?? null
    );
  }
}
