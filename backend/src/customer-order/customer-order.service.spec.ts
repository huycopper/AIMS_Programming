import { CustomerOrderService } from './customer-order.service';

describe('CustomerOrderService', () => {
  const order = {
    orderId: '550e8400-e29b-41d4-a716-446655440000',
    status: 'PENDING_PROCESSING',
    cancelledAt: null,
    deliveryInfo: {
      name: 'Customer',
      phone: '0123456789',
      email: 'customer@example.com',
      province: 'Hanoi',
      address: '1 Dai Co Viet',
      note: null,
    },
    items: [],
    subtotal: 100000,
    vat: 10000,
    shippingFee: 15000,
    totalAmount: 125000,
  };

  it('creates a manual bank transfer refund when a paid QR_CODE order is cancelled', async () => {
    const orderRepo = {
      findOne: jest.fn().mockResolvedValue(order),
      save: jest.fn(async (entity) => entity),
    };
    const paymentTransaction = {
      paymentTransactionId: 'txn-1',
      amount: 125000,
      paymentMethod: 'QR_CODE',
      status: 'SUCCESS',
    };
    const paymentTransactionRepo = {
      findOne: jest.fn().mockResolvedValue(paymentTransaction),
    };
    const refundService = {
      createManualRefundForVietQR: jest.fn().mockResolvedValue({
        refundStatus: 'MANUAL_REQUIRED',
        refundMethod: 'MANUAL_BANK_TRANSFER',
        refundAmount: 125000,
      }),
    };
    const notificationService = {
      sendOrderCancelledNotification: jest.fn().mockResolvedValue(undefined),
    };
    const orderService = {
      calculateShippingFee: jest.fn(),
    };

    const service = new CustomerOrderService(
      orderRepo as any,
      paymentTransactionRepo as any,
      refundService as any,
      notificationService as any,
      orderService as any,
    );

    const result = await service.cancelOrderByToken('cancel-token');

    expect(refundService.createManualRefundForVietQR).toHaveBeenCalledWith(
      paymentTransaction,
      'Customer requested cancellation',
    );
    expect(result).toEqual({
      orderId: order.orderId,
      status: 'CANCELLED',
      refund: {
        refundStatus: 'MANUAL_REQUIRED',
        refundMethod: 'MANUAL_BANK_TRANSFER',
        refundAmount: 125000,
      },
    });
  });
});
