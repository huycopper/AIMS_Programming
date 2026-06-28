import { ConflictException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { OrderFulfillmentService } from './order-fulfillment.service.js';
import { Order } from './entities/order.entity.js';
import { PaymentTransaction } from '../payment/entities/payment-transaction.entity.js';
import {
  Product,
  ProductStatus,
  ProductType,
} from '../product/entities/product.entity.js';
import { ProductHistory } from '../product/entities/product-history.entity.js';
import { RefundService } from '../refund/refund.service.js';
import { OrderFulfillmentNotificationControl } from './notification/order-fulfillment-notification.control.js';
import { ProductStockMovementControl } from '../product/control/product-stock-movement.control.js';
import { ProductHistoryActionType } from '../product/entities/product-history.entity.js';

describe('OrderFulfillmentService', () => {
  const manager = {
    getRepository: jest.fn(),
  };
  const orderManagerRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(async (entity) => entity),
  };
  const paymentManagerRepo = {
    findOne: jest.fn(),
  };
  const productManagerRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(async (entity) => entity),
  };
  const orderLockQueryBuilder = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };
  const productLockQueryBuilder = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };
  const historyManagerRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (entity) => entity),
  };
  const orderRepo = {
    findAndCount: jest.fn(),
    manager,
  } as unknown as jest.Mocked<Repository<Order>>;
  const paymentRepo = {} as unknown as jest.Mocked<
    Repository<PaymentTransaction>
  >;
  const productRepo = {
    findBy: jest.fn(),
  } as unknown as jest.Mocked<Repository<Product>>;
  const dataSource = {
    transaction: jest.fn(async (callback) => callback(manager)),
  } as unknown as jest.Mocked<DataSource>;
  const refundService = {
    getRefundByPaymentTransaction: jest.fn(),
    createManualRefundForVietQR: jest.fn(),
    createPaypalRefund: jest.fn(),
  } as unknown as jest.Mocked<RefundService>;
  const notificationControl = {
    sendApproved: jest.fn(),
    sendRejected: jest.fn(),
  } as unknown as jest.Mocked<OrderFulfillmentNotificationControl>;
  const stockMovementControl = new ProductStockMovementControl();

  let service: OrderFulfillmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    orderManagerRepo.createQueryBuilder.mockReturnValue(orderLockQueryBuilder);
    orderLockQueryBuilder.getOne.mockImplementation(() =>
      orderManagerRepo.findOne(),
    );
    productManagerRepo.createQueryBuilder.mockReturnValue(
      productLockQueryBuilder,
    );
    productLockQueryBuilder.getOne.mockImplementation(() =>
      productManagerRepo.findOne(),
    );
    manager.getRepository.mockImplementation((entity) => {
      if (entity === Order) {
        return orderManagerRepo;
      }
      if (entity === PaymentTransaction) {
        return paymentManagerRepo;
      }
      if (entity === Product) {
        return productManagerRepo;
      }
      if (entity === ProductHistory) {
        return historyManagerRepo;
      }
      return {};
    });
    refundService.getRefundByPaymentTransaction.mockResolvedValue(null);
    notificationControl.sendApproved.mockResolvedValue({ sent: true });
    notificationControl.sendRejected.mockResolvedValue({ sent: true });
    service = new OrderFulfillmentService(
      orderRepo,
      paymentRepo,
      productRepo,
      dataSource,
      refundService,
      notificationControl,
      stockMovementControl,
    );
  });

  it('caps pending order list limit at 30', async () => {
    orderRepo.findAndCount.mockResolvedValue([[makeOrder()], 1]);
    paymentManagerRepo.findOne.mockResolvedValue(makePayment());

    const result = await service.listPendingOrders({ page: 1, limit: 99 });

    expect(orderRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ take: 30, skip: 0 }),
    );
    expect(result.limit).toBe(30);
  });

  it('approves a pending order, deducts stock once, and records stock history', async () => {
    const order = makeOrder();
    const payment = makePayment();
    const product = makeProduct({ stockQuantity: 5 });
    orderManagerRepo.findOne.mockResolvedValue(order);
    paymentManagerRepo.findOne.mockResolvedValue(payment);
    productManagerRepo.findOne.mockResolvedValue(product);
    productRepo.findBy.mockResolvedValue([product]);

    const result = await service.approveOrder(order.orderId, 'manager-1');

    expect(order.status).toBe('APPROVED');
    expect(order.processedBy).toBe('manager-1');
    expect(product.stockQuantity).toBe(3);
    expect(orderManagerRepo.createQueryBuilder).toHaveBeenCalledWith(
      'lockedOrder',
    );
    expect(orderLockQueryBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
    );
    expect(productManagerRepo.createQueryBuilder).toHaveBeenCalledWith(
      'lockedProduct',
    );
    expect(productLockQueryBuilder.setLock).toHaveBeenCalledWith(
      'pessimistic_write',
    );
    expect(historyManagerRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: product.productId,
        performedBy: 'manager-1',
        actionType: ProductHistoryActionType.STOCK_ADJUST,
        reason: `Order approved: ${order.orderId}`,
        oldValueSnapshot: expect.objectContaining({ stockQuantity: 5 }),
        newValueSnapshot: expect.objectContaining({ stockQuantity: 3 }),
      }),
    );
    expect(result.stockResults).toEqual([
      expect.objectContaining({ previousStock: 5, newStock: 3 }),
    ]);
  });

  it('rolls back approval when stock is insufficient', async () => {
    const order = makeOrder();
    orderManagerRepo.findOne.mockResolvedValue(order);
    paymentManagerRepo.findOne.mockResolvedValue(makePayment());
    productManagerRepo.findOne.mockResolvedValue(
      makeProduct({ stockQuantity: 1 }),
    );

    await expect(
      service.approveOrder(order.orderId, 'manager-1'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(productManagerRepo.save).not.toHaveBeenCalled();
    expect(historyManagerRepo.save).not.toHaveBeenCalled();
    expect(order.status).toBe('PENDING_PROCESSING');
  });

  it('does not deduct stock twice when an already approved order is approved again', async () => {
    const order = makeOrder();
    const payment = makePayment();
    const product = makeProduct({ stockQuantity: 5 });
    const approvedOrder = makeOrder();
    approvedOrder.status = 'APPROVED';

    orderManagerRepo.findOne
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce(approvedOrder)
      .mockResolvedValueOnce(approvedOrder);
    paymentManagerRepo.findOne.mockResolvedValue(payment);
    productManagerRepo.findOne.mockResolvedValue(product);
    productRepo.findBy.mockResolvedValue([product]);

    await service.approveOrder(order.orderId, 'manager-1');
    await expect(
      service.approveOrder(order.orderId, 'manager-2'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(product.stockQuantity).toBe(3);
    expect(productManagerRepo.save).toHaveBeenCalledTimes(1);
    expect(historyManagerRepo.save).toHaveBeenCalledTimes(1);
  });

  it('rejects a pending VietQR order with idempotent manual refund and no stock change', async () => {
    const order = makeOrder();
    const refund = {
      refundTransactionId: 'refund-1',
      refundStatus: 'MANUAL_REQUIRED',
      refundMethod: 'MANUAL_BANK_TRANSFER',
      refundAmount: 100000,
      refundReason: 'Out of stock',
      manualRefundNote: null,
    } as any;
    orderManagerRepo.findOne.mockResolvedValue(order);
    paymentManagerRepo.findOne.mockResolvedValue(makePayment());
    refundService.createManualRefundForVietQR.mockResolvedValue(refund);
    productRepo.findBy.mockResolvedValue([makeProduct({ stockQuantity: 5 })]);

    const result = await service.rejectOrder(
      order.orderId,
      'Out of stock',
      'manager-1',
    );

    expect(order.status).toBe('REJECTED');
    expect(order.rejectionReason).toBe('Out of stock');
    expect(productManagerRepo.save).not.toHaveBeenCalled();
    expect(refundService.createManualRefundForVietQR).toHaveBeenCalled();
    expect(result.refund.refundStatus).toBe('MANUAL_REQUIRED');
  });

  it('rejects a pending PayPal order through the PayPal refund boundary', async () => {
    const order = makeOrder();
    const payment = makePayment({ paymentMethod: 'PAYPAL' });
    const refund = {
      refundTransactionId: 'refund-paypal-1',
      refundStatus: 'SUCCESS',
      refundMethod: 'PAYPAL_API',
      refundAmount: 132000,
      refundReason: 'Unavailable item',
      manualRefundNote: null,
    } as any;
    orderManagerRepo.findOne.mockResolvedValue(order);
    paymentManagerRepo.findOne.mockResolvedValue(payment);
    refundService.createPaypalRefund.mockResolvedValue(refund);
    productRepo.findBy.mockResolvedValue([makeProduct({ stockQuantity: 5 })]);

    const result = await service.rejectOrder(
      order.orderId,
      'Unavailable item',
      'manager-1',
    );

    expect(order.status).toBe('REJECTED');
    expect(productManagerRepo.save).not.toHaveBeenCalled();
    expect(refundService.createManualRefundForVietQR).not.toHaveBeenCalled();
    expect(refundService.createPaypalRefund).toHaveBeenCalledWith(
      payment,
      'Unavailable item',
      manager,
    );
    expect(result.refund.refundMethod).toBe('PAYPAL_API');
  });

  it('keeps approved state and returns a warning when approval email fails', async () => {
    const order = makeOrder();
    const payment = makePayment();
    const product = makeProduct({ stockQuantity: 5 });
    orderManagerRepo.findOne.mockResolvedValue(order);
    paymentManagerRepo.findOne.mockResolvedValue(payment);
    productManagerRepo.findOne.mockResolvedValue(product);
    productRepo.findBy.mockResolvedValue([product]);
    notificationControl.sendApproved.mockResolvedValue({
      sent: false,
      error: 'SMTP unavailable',
    });

    const result = await service.approveOrder(order.orderId, 'manager-1');

    expect(order.status).toBe('APPROVED');
    expect(product.stockQuantity).toBe(3);
    expect(result.notification).toEqual({
      sent: false,
      error: 'SMTP unavailable',
    });
  });

  function makeOrder(): Order {
    return {
      orderId: 'order-1',
      status: 'PENDING_PROCESSING',
      deliveryInfo: {
        deliveryInfoId: 'delivery-1',
        name: 'Nguyen Van A',
        email: 'a@example.com',
        phone: '0123456789',
        province: 'Ha Noi',
        address: '1 A Street',
        note: null,
      },
      items: [
        {
          orderItemId: 'item-1',
          productId: 'product-1',
          productTitle: 'Book',
          quantity: 2,
          unitPrice: 50000,
          weight: 1,
        },
      ],
      subtotal: 100000,
      vat: 10000,
      shippingFee: 22000,
      totalAmount: 132000,
      totalWeight: 2,
      orderViewToken: 'view-token',
      cancelToken: 'cancel-token',
      cancelledAt: null,
      processedBy: null,
      processedAt: null,
      rejectionReason: null,
      createdAt: new Date('2026-06-23T00:00:00Z'),
      updatedAt: new Date('2026-06-23T00:00:00Z'),
    } as Order;
  }

  function makePayment(
    overrides: Partial<PaymentTransaction> = {},
  ): PaymentTransaction {
    return {
      paymentTransactionId: 'payment-1',
      amount: 132000,
      paymentMethod: 'VIETQR',
      status: 'SUCCESS',
      transactionRef: 'ref-1',
      paymentDetails: {},
      receiptEmailSentAt: null,
      receiptEmailError: null,
      createdAt: new Date('2026-06-23T00:00:00Z'),
      updatedAt: new Date('2026-06-23T00:00:00Z'),
      ...overrides,
    } as PaymentTransaction;
  }

  function makeProduct(overrides: Partial<Product> = {}): Product {
    return {
      productId: 'product-1',
      productType: ProductType.BOOK,
      title: 'Book',
      category: 'Book',
      generalDescription: null,
      height: 1,
      width: 1,
      length: 1,
      weight: 1,
      barcode: 'barcode-1',
      originalValue: 50000,
      currentPrice: 50000,
      stockQuantity: 5,
      status: ProductStatus.ACTIVE,
      createdAt: new Date('2026-06-23T00:00:00Z'),
      updatedAt: new Date('2026-06-23T00:00:00Z'),
      ...overrides,
    } as Product;
  }
});
