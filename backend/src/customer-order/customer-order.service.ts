import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../order/entities/order.entity.js';
import { PaymentTransaction } from '../payment/entities/payment-transaction.entity.js';
import { RefundService } from '../refund/refund.service.js';
import { NotificationService } from '../notification/notification.service.js';
import { OrderService } from '../order/order.service.js';

@Injectable()
export class CustomerOrderService {
  private readonly logger = new Logger(CustomerOrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
    private readonly refundService: RefundService,
    private readonly notificationService: NotificationService,
    private readonly orderService: OrderService,
  ) {}

  async getOrderByViewToken(viewToken: string) {
    const order = await this.orderRepo.findOne({
      where: { orderViewToken: viewToken },
    });

    if (!order) {
      throw new NotFoundException('Order not found or invalid token');
    }

    const transaction = await this.paymentTransactionRepo.findOne({
      where: { order: { orderId: order.orderId }, status: 'SUCCESS' },
      order: { createdAt: 'DESC' },
    });

    const canCancel = order.status === 'PENDING' || order.status === 'PENDING_PROCESSING';

    const cartItems = (order.items || []).map((item) => ({
      productId: item.productId,
      productTitle: item.productTitle,
      quantity: Number(item.quantity),
      weight: Number(item.weight),
      currentPrice: Number(item.unitPrice),
    }));
    const invoice = this.orderService.calculateShippingFee(order.deliveryInfo.province, cartItems);

    return {
      orderId: order.orderId,
      status: order.status,
      canCancel,
      deliveryInfo: {
        name: order.deliveryInfo.name,
        phone: order.deliveryInfo.phone,
        email: order.deliveryInfo.email || '',
        province: order.deliveryInfo.province,
        address: order.deliveryInfo.address,
        note: order.deliveryInfo.note || undefined,
      },
      items: cartItems,
      invoice: {
        subtotal: Number(order.subtotal),
        vat: Number(order.vat),
        shippingFee: Number(order.shippingFee),
        totalAmount: Number(order.totalAmount),
      },
      paymentTransaction: transaction
        ? {
            paymentTransactionId: transaction.paymentTransactionId,
            transactionReference: transaction.transactionRef,
            transactionDatetime: transaction.createdAt.toISOString(),
            amount: Number(transaction.amount),
            paymentMethod: transaction.paymentMethod,
            status: transaction.status,
          }
        : null,
    };
  }

  async cancelOrderByToken(cancelToken: string, reason?: string) {
    const order = await this.orderRepo.findOne({
      where: { cancelToken },
    });

    if (!order) {
      throw new NotFoundException('Order not found or invalid token');
    }

    if (order.status !== 'PENDING' && order.status !== 'PENDING_PROCESSING') {
      throw new ConflictException(`Order cannot be cancelled in status ${order.status}`);
    }

    // Process cancellation
    order.status = 'CANCELLED';
    order.cancelledAt = new Date();
    order.cancelReason = reason || 'Customer requested cancellation';
    
    await this.orderRepo.save(order);
    this.logger.log(`Order ${order.orderId} cancelled by customer. Reason: ${order.cancelReason}`);

    let refundSummary: any = null;

    // Check if there's a successful payment that needs refunding
    const transaction = await this.paymentTransactionRepo.findOne({
      where: { order: { orderId: order.orderId }, status: 'SUCCESS' },
      order: { createdAt: 'DESC' },
    });

    if (transaction) {
      if (transaction.paymentMethod === 'VIETQR') {
        const refund = await this.refundService.createManualRefundForVietQR(transaction, order.cancelReason);
        refundSummary = {
          refundStatus: refund.refundStatus,
          refundMethod: refund.refundMethod,
          refundAmount: Number(refund.refundAmount),
        };
        
        // Fire and forget notification
        this.notificationService.sendOrderCancelledNotification(order, refund).catch((err) => {
          this.logger.error(`Failed to send cancellation notification for order ${order.orderId}`, err.stack);
        });
      } else {
        // PayPal or other methods would go here in the future
        this.logger.warn(`Refund for payment method ${transaction.paymentMethod} is not yet implemented.`);
      }
    }

    return {
      orderId: order.orderId,
      status: order.status,
      refund: refundSummary,
    };
  }
}
