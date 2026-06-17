import { JwtService } from '@nestjs/jwt';
import { TransactionSyncController } from '../../boundaries/viet-qr/transaction-sync.controller';
import { TransactionSyncService } from './transaction-sync.service';
import { Order } from '../../order/entities/order.entity';
import { PATH_METADATA } from '@nestjs/common/constants';

describe('Transaction Sync contract', () => {
  const jwtSecret = 'test-secret';
  const jwtService = new JwtService({ secret: jwtSecret });
  const validToken = jwtService.sign({ username: 'vietqr' }, { secret: jwtSecret, expiresIn: '5m' });

  const order = {
    orderId: '550e8400-e29b-41d4-a716-446655440000',
    status: 'PENDING',
    totalAmount: 125000,
    deliveryInfo: { email: 'customer@example.com' },
  } as Order;

  const validBody = {
    bankaccount: '123456789',
    amount: 125000,
    transType: 'C',
    content: 'AIMS 550e8400e29b4',
    transactionid: 'VQR-TXN-1',
    transactiontime: 1781744523000,
    referencenumber: 'VQR-REF-1',
    orderId: '550e8400e29b4',
  };

  let paymentTransactionRepo: any;
  let orderRepo: any;
  let notificationService: any;
  let queryBuilder: any;

  beforeEach(() => {
    process.env.JWT_SECRET = jwtSecret;
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(order),
    };
    paymentTransactionRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((entity) => ({
        paymentTransactionId: 'AIMS-TXN-1',
        createdAt: new Date('2026-06-18T01:02:03.000Z'),
        ...entity,
      })),
      save: jest.fn(async (entity) => entity),
    };
    orderRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      save: jest.fn(async (entity) => entity),
    };
    notificationService = {
      sendPaymentSuccessNotification: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('exposes POST /bank/api/transaction-sync as the application callback route', () => {
    const route = Reflect.getMetadata(
      PATH_METADATA,
      TransactionSyncController.prototype.transactionSync,
    );

    expect(route).toBe('bank/api/transaction-sync');
  });

  it('rejects missing Authorization with VietQR error shape and persists nothing', async () => {
    const service = new TransactionSyncService(
      paymentTransactionRepo,
      orderRepo,
      jwtService,
      notificationService,
    );

    const result = await service.handleTransactionSync(validBody, undefined);

    expect(result).toEqual({
      statusCode: 401,
      body: {
        error: true,
        errorReason: 'INVALID_AUTH_HEADER',
        toastMessage: 'Authorization header is missing or invalid',
        object: null,
      },
    });
    expect(paymentTransactionRepo.save).not.toHaveBeenCalled();
  });

  it('rejects invalid or expired Bearer tokens and persists nothing', async () => {
    const service = new TransactionSyncService(
      paymentTransactionRepo,
      orderRepo,
      jwtService,
      notificationService,
    );

    const result = await service.handleTransactionSync(validBody, 'Bearer not-a-jwt');

    expect(result.body).toMatchObject({
      error: true,
      errorReason: 'INVALID_TOKEN',
      object: null,
    });
    expect(result.statusCode).toBe(401);
    expect(paymentTransactionRepo.save).not.toHaveBeenCalled();
  });

  it('rejects missing required Transaction Sync fields and persists nothing', async () => {
    const service = new TransactionSyncService(
      paymentTransactionRepo,
      orderRepo,
      jwtService,
      notificationService,
    );

    const result = await service.handleTransactionSync(
      { ...validBody, bankaccount: undefined },
      `Bearer ${validToken}`,
    );

    expect(result.statusCode).toBe(400);
    expect(result.body).toMatchObject({
      error: true,
      errorReason: 'VALIDATION_FAILED',
      object: null,
    });
    expect(paymentTransactionRepo.save).not.toHaveBeenCalled();
  });

  it('rejects amount mismatch before persistence', async () => {
    const service = new TransactionSyncService(
      paymentTransactionRepo,
      orderRepo,
      jwtService,
      notificationService,
    );

    const result = await service.handleTransactionSync(
      { ...validBody, amount: 124999 },
      `Bearer ${validToken}`,
    );

    expect(result.statusCode).toBe(400);
    expect(result.body).toMatchObject({
      error: true,
      errorReason: 'AMOUNT_MISMATCH',
      object: null,
    });
    expect(paymentTransactionRepo.save).not.toHaveBeenCalled();
  });

  it('rejects content mismatch before persistence', async () => {
    const service = new TransactionSyncService(
      paymentTransactionRepo,
      orderRepo,
      jwtService,
      notificationService,
    );

    const result = await service.handleTransactionSync(
      { ...validBody, content: 'AIMS OTHERORDER' },
      `Bearer ${validToken}`,
    );

    expect(result.statusCode).toBe(400);
    expect(result.body).toMatchObject({
      error: true,
      errorReason: 'CONTENT_MISMATCH',
      object: null,
    });
    expect(paymentTransactionRepo.save).not.toHaveBeenCalled();
  });

  it('persists a successful QR_CODE payment, updates order state, sends email, and never scans all orders', async () => {
    const service = new TransactionSyncService(
      paymentTransactionRepo,
      orderRepo,
      jwtService,
      notificationService,
    );

    const result = await service.handleTransactionSync(validBody, `Bearer ${validToken}`);

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({
      error: false,
      errorReason: null,
      toastMessage: 'Transaction processed successfully',
      object: { reftransactionid: expect.any(String) },
    });
    expect(orderRepo.find).not.toHaveBeenCalled();
    expect(orderRepo.createQueryBuilder).toHaveBeenCalledWith('order');
    expect(paymentTransactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        order,
        amount: 125000,
        status: 'SUCCESS',
        paymentMethod: 'QR_CODE',
        transactionContent: 'AIMS 550e8400e29b4',
        transactionDatetime: new Date(1781744523000),
        gatewayTransactionRef: 'VQR-REF-1',
      }),
    );
    expect(order.status).toBe('PENDING_PROCESSING');
    expect(orderRepo.save).toHaveBeenCalledWith(order);
    expect(notificationService.sendPaymentSuccessNotification).toHaveBeenCalledTimes(1);
  });

  it('handles duplicate callbacks idempotently without duplicate persistence, email, or order side effects', async () => {
    paymentTransactionRepo.findOne.mockResolvedValue({
      paymentTransactionId: 'existing-transaction',
      gatewayTransactionRef: 'VQR-REF-1',
      status: 'SUCCESS',
    });
    const service = new TransactionSyncService(
      paymentTransactionRepo,
      orderRepo,
      jwtService,
      notificationService,
    );

    const result = await service.handleTransactionSync(validBody, `Bearer ${validToken}`);

    expect(result.statusCode).toBe(200);
    expect(result.body.object.reftransactionid).toBe('existing-transaction');
    expect(paymentTransactionRepo.create).not.toHaveBeenCalled();
    expect(paymentTransactionRepo.save).not.toHaveBeenCalled();
    expect(orderRepo.save).not.toHaveBeenCalled();
    expect(notificationService.sendPaymentSuccessNotification).not.toHaveBeenCalled();
  });
});
