import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Order } from '../../../order/entities/order.entity.js';
import { PaymentTransaction } from '../../../payment/entities/payment-transaction.entity.js';
import { VietQRBoundary } from '../boundary/gateway/vietqr.boundary.js';
import { PayThroughVietQRController } from './pay-through-vietqr.controller.js';

describe('PayThroughVietQRController', () => {
  let controller: PayThroughVietQRController;
  let vietQRBoundary: jest.Mocked<
    Pick<
      VietQRBoundary,
      'getAccessToken' | 'generateQRCode' | 'handleAPICallback'
    >
  >;
  let paymentTransactionRepo: jest.Mocked<
    Pick<Repository<PaymentTransaction>, 'createQueryBuilder'>
  >;
  let orderRepo: jest.Mocked<Pick<Repository<Order>, 'findOne' | 'save'>>;

  beforeEach(() => {
    vietQRBoundary = {
      getAccessToken: jest.fn(),
      generateQRCode: jest.fn(),
      handleAPICallback: jest.fn(),
    };
    paymentTransactionRepo = {
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<
      Pick<Repository<PaymentTransaction>, 'createQueryBuilder'>
    >;
    orderRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (order) => order),
    } as unknown as jest.Mocked<Pick<Repository<Order>, 'findOne' | 'save'>>;

    controller = new PayThroughVietQRController(
      vietQRBoundary as unknown as VietQRBoundary,
      {} as JwtService,
      paymentTransactionRepo as unknown as Repository<PaymentTransaction>,
      orderRepo as unknown as Repository<Order>,
    );
  });

  it('uses VietQR returned content for callback and confirmation content', async () => {
    const order = {
      orderId: 'order-123',
      status: 'PENDING',
      totalAmount: 132000,
      deliveryInfo: {
        name: 'Dong Dai Huy',
        phone: '0333016514',
        province: 'Ha Noi',
        address: 'Ta Quang Buu',
        email: 'huy@example.com',
      },
    } as unknown as Order;
    const returnedContent = 'AIMS RETURNED CONTENT 123';
    const callbackContent = 'AIMS original-order-content';
    const transaction = {
      paymentTransactionId: 'payment-tx-1',
      transactionRef: 'ref-1',
      amount: 132000,
      paymentMethod: 'VIETQR',
      status: 'SUCCESS',
      createdAt: new Date('2026-06-28T12:00:00Z'),
      paymentDetails: {
        transactionid: 'bank-tx-1',
        transactiontime: Date.UTC(2026, 5, 28, 12, 0, 0),
        content: callbackContent,
      },
    } as PaymentTransaction;
    const queryBuilder = {
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(transaction),
    };

    vietQRBoundary.getAccessToken.mockResolvedValue('vietqr-token');
    vietQRBoundary.generateQRCode.mockResolvedValue({
      qrDataURL: 'data:image/png;base64,qr',
      amount: 132000,
      content: returnedContent,
    });
    vietQRBoundary.handleAPICallback.mockResolvedValue({
      status: 'SUCCESS',
      message: 'Callback accepted',
    });
    orderRepo.findOne.mockResolvedValue(order);
    paymentTransactionRepo.createQueryBuilder.mockReturnValue(
      queryBuilder as never,
    );

    await controller.generateQRCode(order);
    const response = await controller.confirmPayment(order);

    expect(vietQRBoundary.handleAPICallback).toHaveBeenCalledWith(
      order,
      'vietqr-token',
      returnedContent,
    );
    expect(response.transaction?.transactionContent).toBe(returnedContent);
    expect(response.transaction?.transactionContent).not.toBe(callbackContent);
  });
});
