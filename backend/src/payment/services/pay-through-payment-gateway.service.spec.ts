import { BadRequestException } from '@nestjs/common';
import { PayThroughPaymentGatewayController } from './pay-through-payment-gateway.service';
import { Order } from '../../order/entities/order.entity';

describe('PayThroughPaymentGatewayController', () => {
  const order = {
    orderId: '550e8400-e29b-41d4-a716-446655440000',
    status: 'PENDING',
    totalAmount: 125000,
    deliveryInfo: {
      name: 'Customer',
      phone: '0123456789',
      address: '1 Dai Co Viet',
      province: 'Hanoi',
      email: 'customer@example.com',
    },
  } as Order;

  const paymentTransactionRepo = {
    createQueryBuilder: jest.fn(),
  };

  const orderRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates QR generation to the VietQR gateway without storing request token state', async () => {
    const vietQRBoundary = {
      generateQRCode: jest.fn().mockResolvedValue({
        qrDataURL: 'data:image/png;base64,qr',
        amount: 125000,
        content: 'AIMS 550e8400e29b4',
        orderId: '550e8400e29b4',
      }),
    };
    const service = new PayThroughPaymentGatewayController(
      vietQRBoundary as any,
      paymentTransactionRepo as any,
      orderRepo as any,
    );

    await service.generateQRCode(order);

    expect(vietQRBoundary.generateQRCode).toHaveBeenCalledWith(order);
    expect((service as any).accessToken).toBeUndefined();
  });

  it('confirms payment through the VietQR gateway without depending on a previous generateQRCode token', async () => {
    const vietQRBoundary = {
      handleAPICallback: jest.fn().mockResolvedValue({
        status: 'FAILED',
        message: 'sandbox rejected callback',
      }),
    };
    const service = new PayThroughPaymentGatewayController(
      vietQRBoundary as any,
      paymentTransactionRepo as any,
      orderRepo as any,
    );

    const result = await service.confirmPayment(order);

    expect(vietQRBoundary.handleAPICallback).toHaveBeenCalledWith(order);
    expect(result).toMatchObject({
      status: 'FAILED',
      message: 'sandbox rejected callback',
      orderId: order.orderId,
    });
  });

  it('returns the latest successful QR_CODE transaction in confirmation summaries', async () => {
    const transaction = {
      paymentTransactionId: 'txn-1',
      gatewayTransactionRef: 'REF-1',
      transactionContent: 'AIMS 550e8400e29b4',
      transactionDatetime: new Date('2026-06-18T01:02:03.000Z'),
      amount: 125000,
      paymentMethod: 'QR_CODE',
      status: 'SUCCESS',
      createdAt: new Date('2026-06-18T01:02:03.000Z'),
    };
    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(transaction),
    };
    paymentTransactionRepo.createQueryBuilder.mockReturnValue(queryBuilder);
    orderRepo.findOne.mockResolvedValue(order);

    const service = new PayThroughPaymentGatewayController(
      {} as any,
      paymentTransactionRepo as any,
      orderRepo as any,
    );

    const result = await service.getPaymentConfirmation(order.orderId);

    expect(result.transaction).toEqual({
      transactionId: 'REF-1',
      paymentTransactionId: 'txn-1',
      transactionReference: 'REF-1',
      transactionContent: 'AIMS 550e8400e29b4',
      transactionDatetime: '2026-06-18T01:02:03.000Z',
      amount: 125000,
      paymentMethod: 'QR_CODE',
      status: 'SUCCESS',
    });
  });

  it('rejects confirmation polling for a missing order', async () => {
    orderRepo.findOne.mockResolvedValue(null);
    const service = new PayThroughPaymentGatewayController(
      {} as any,
      paymentTransactionRepo as any,
      orderRepo as any,
    );

    await expect(service.getPaymentConfirmation('missing')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
