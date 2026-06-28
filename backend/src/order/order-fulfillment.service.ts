import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Order, OrderItem } from './entities/order.entity.js';
import { QueryPendingOrdersDto } from './dto/query-pending-orders.dto.js';
import { PaymentTransaction } from '../payment/entities/payment-transaction.entity.js';
import { Product, ProductStatus } from '../product/entities/product.entity.js';
import {
  ProductStockMovementControl,
  StockConflict,
} from '../product/control/product-stock-movement.control.js';
import { RefundService } from '../refund/refund.service.js';
import { RefundTransaction } from '../refund/entities/refund-transaction.entity.js';
import {
  FulfillmentNotificationResult,
  OrderFulfillmentNotificationControl,
} from './notification/order-fulfillment-notification.control.js';

const PENDING_PROCESSING = 'PENDING_PROCESSING';
const APPROVED = 'APPROVED';
const REJECTED = 'REJECTED';

@Injectable()
export class OrderFulfillmentService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly refundService: RefundService,
    private readonly notificationControl: OrderFulfillmentNotificationControl,
    private readonly stockMovementControl: ProductStockMovementControl,
  ) {}

  async listPendingOrders(dto: QueryPendingOrdersDto) {
    const page = dto.page ?? 1;
    const limit = Math.min(dto.limit ?? 30, 30);
    const [orders, total] = await this.orderRepo.findAndCount({
      where: { status: PENDING_PROCESSING },
      relations: { deliveryInfo: true, items: true },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = await Promise.all(
      orders.map(async (order) => this.buildOrderSummary(order)),
    );

    return { data, total, page, limit };
  }

  async getPendingOrderDetail(orderId: string) {
    const order = await this.findOrderOrFail(this.orderRepo.manager, orderId);
    this.assertPending(order);
    return this.buildOrderDetail(order);
  }

  async approveOrder(orderId: string, processedBy: string) {
    const result = await this.dataSource.transaction(async (manager) => {
      const order = await this.findOrderForUpdate(manager, orderId);
      this.assertPending(order);
      const payment = await this.findLatestSuccessfulPayment(manager, orderId);
      if (!payment) {
        throw new ConflictException({
          message: 'Order has no successful payment transaction.',
          code: 'MISSING_SUCCESSFUL_PAYMENT',
        });
      }

      const deductions = await this.stockMovementControl.deductForApprovedOrder(
        manager,
        order,
        processedBy,
      );
      order.status = APPROVED;
      order.processedBy = processedBy;
      order.processedAt = new Date();
      await manager.getRepository(Order).save(order);

      return { order, payment, deductions };
    });

    const email = await this.notificationControl.sendApproved(result.order);
    return {
      ...(await this.buildOrderDetail(result.order, result.payment)),
      stockResults: result.deductions,
      notification: email,
    };
  }

  async rejectOrder(orderId: string, reason: string, processedBy: string) {
    const result = await this.dataSource.transaction(async (manager) => {
      const order = await this.findOrderForUpdate(manager, orderId);
      this.assertPending(order);
      const payment = await this.findLatestSuccessfulPayment(manager, orderId);
      if (!payment) {
        throw new ConflictException({
          message: 'Order has no successful payment transaction.',
          code: 'MISSING_SUCCESSFUL_PAYMENT',
        });
      }

      order.status = REJECTED;
      order.processedBy = processedBy;
      order.processedAt = new Date();
      order.rejectionReason = reason;
      await manager.getRepository(Order).save(order);

      const refund = await this.createRefund(manager, payment, reason);
      return { order, payment, refund };
    });

    const email = await this.notificationControl.sendRejected(
      result.order,
      result.refund,
    );
    return {
      ...(await this.buildOrderDetail(
        result.order,
        result.payment,
        result.refund,
      )),
      refund: this.toRefundSummary(result.refund),
      notification: email,
    };
  }

  private async createRefund(
    manager: EntityManager,
    payment: PaymentTransaction,
    reason: string,
  ): Promise<RefundTransaction> {
    if (payment.paymentMethod === 'VIETQR') {
      return this.refundService.createManualRefundForVietQR(
        payment,
        reason,
        manager,
      );
    }
    return this.refundService.createPaypalRefund(payment, reason, manager);
  }

  private async buildOrderSummary(order: Order) {
    const payment = await this.findLatestSuccessfulPayment(
      this.orderRepo.manager,
      order.orderId,
    );
    const refund = payment
      ? await this.refundService.getRefundByPaymentTransaction(
          payment.paymentTransactionId,
        )
      : null;

    return {
      orderId: order.orderId,
      status: order.status,
      createdAt: order.createdAt?.toISOString?.() ?? order.createdAt,
      customerName: order.deliveryInfo?.name,
      customerEmail: order.deliveryInfo?.email,
      customerPhone: order.deliveryInfo?.phone,
      province: order.deliveryInfo?.province,
      address: order.deliveryInfo?.address,
      itemCount: (order.items || []).reduce(
        (total, item) => total + Number(item.quantity),
        0,
      ),
      totalAmount: Number(order.totalAmount),
      payment: this.toPaymentSummary(payment),
      refund: this.toRefundSummary(refund),
    };
  }

  private async buildOrderDetail(
    order: Order,
    payment?: PaymentTransaction | null,
    refund?: RefundTransaction | null,
  ) {
    const latestPayment =
      payment ??
      (await this.findLatestSuccessfulPayment(
        this.orderRepo.manager,
        order.orderId,
      ));
    const latestRefund =
      refund ??
      (latestPayment
        ? await this.refundService.getRefundByPaymentTransaction(
            latestPayment.paymentTransactionId,
          )
        : null);
    const products = await this.loadProductsForItems(order.items || []);
    const stockConflicts: StockConflict[] = [];
    const items = (order.items || []).map((item) => {
      const product = products.get(item.productId);
      const requested = Number(item.quantity);
      const available = product ? Number(product.stockQuantity) : 0;
      if (
        !product ||
        product.status !== ProductStatus.ACTIVE ||
        available < requested
      ) {
        stockConflicts.push({
          productId: item.productId,
          title: product?.title || item.productTitle,
          requested,
          available,
        });
      }
      return {
        orderItemId: item.orderItemId,
        productId: item.productId,
        productTitle: item.productTitle,
        quantity: requested,
        unitPrice: Number(item.unitPrice),
        weight: Number(item.weight),
        lineTotal: Number(item.unitPrice) * requested,
        currentProduct: product
          ? {
              productId: product.productId,
              title: product.title,
              stockQuantity: Number(product.stockQuantity),
              status: product.status,
            }
          : null,
      };
    });

    return {
      ...(await this.buildOrderSummary(order)),
      deliveryInfo: order.deliveryInfo,
      items,
      invoice: {
        subtotal: Number(order.subtotal),
        vat: Number(order.vat),
        shippingFee: Number(order.shippingFee),
        totalAmount: Number(order.totalAmount),
        totalWeight: Number(order.totalWeight),
      },
      payment: this.toPaymentSummary(latestPayment),
      refund: this.toRefundSummary(latestRefund),
      processedBy: order.processedBy,
      processedAt: order.processedAt?.toISOString?.() ?? order.processedAt,
      rejectionReason: order.rejectionReason,
      canApprove:
        order.status === PENDING_PROCESSING && stockConflicts.length === 0,
      canReject: order.status === PENDING_PROCESSING,
      stockConflicts,
    };
  }

  private async loadProductsForItems(items: OrderItem[]) {
    const ids = [...new Set(items.map((item) => item.productId))];
    if (ids.length === 0) {
      return new Map<string, Product>();
    }
    const products = await this.productRepo.findBy({ productId: In(ids) });
    return new Map(products.map((product) => [product.productId, product]));
  }

  private async findOrderOrFail(manager: EntityManager, orderId: string) {
    const order = await manager.getRepository(Order).findOne({
      where: { orderId },
      relations: { deliveryInfo: true, items: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found.');
    }
    return order;
  }

  private async findOrderForUpdate(manager: EntityManager, orderId: string) {
    const orderRepo = manager.getRepository(Order);
    const lockedOrder = await orderRepo
      .createQueryBuilder('lockedOrder')
      .setLock('pessimistic_write')
      .where('lockedOrder.orderId = :orderId', { orderId })
      .getOne();

    if (!lockedOrder) {
      throw new NotFoundException('Order not found.');
    }

    return this.findOrderOrFail(manager, orderId);
  }

  private async findLatestSuccessfulPayment(
    manager: EntityManager,
    orderId: string,
  ): Promise<PaymentTransaction | null> {
    return manager.getRepository(PaymentTransaction).findOne({
      where: { order: { orderId }, status: 'SUCCESS' },
      order: { createdAt: 'DESC' },
    });
  }

  private assertPending(order: Order): void {
    if (order.status !== PENDING_PROCESSING) {
      throw new ConflictException({
        message: `Order cannot be processed in status ${order.status}.`,
        code: 'ORDER_NOT_PENDING_PROCESSING',
        status: order.status,
      });
    }
  }

  private toPaymentSummary(payment: PaymentTransaction | null) {
    if (!payment) {
      return null;
    }
    return {
      paymentTransactionId: payment.paymentTransactionId,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      transactionRef: payment.transactionRef,
      amount: Number(payment.amount),
      createdAt: payment.createdAt?.toISOString?.() ?? payment.createdAt,
    };
  }

  private toRefundSummary(refund: RefundTransaction | null) {
    if (!refund) {
      return null;
    }
    return {
      refundTransactionId: refund.refundTransactionId,
      refundStatus: refund.refundStatus,
      refundMethod: refund.refundMethod,
      refundAmount: Number(refund.refundAmount),
      refundReason: refund.refundReason,
      manualRefundNote: refund.manualRefundNote,
    };
  }
}
