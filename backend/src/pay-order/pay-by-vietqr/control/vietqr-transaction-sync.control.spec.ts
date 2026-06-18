import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { PaymentTransaction } from '../../../payment/entities/payment-transaction.entity.js';
import { Order } from '../../../order/entities/order.entity.js';
import { NotificationService } from '../../../notification/notification.service.js';
import { VietQrCallbackValidatorControl } from './vietqr-callback-validator.control.js';
import { VietQrOrderMatcherControl } from './vietqr-order-matcher.control.js';
import { VietQrPaymentTransactionFactory } from './vietqr-payment-transaction-factory.js';
import { VietQrTransactionSyncControl } from './vietqr-transaction-sync.control.js';
import { TransactionCallbackDto } from '../entity/vietqr-transaction-sync.dto.js';

describe('VietQR Split Webhook Components', () => {
  let callbackValidator: VietQrCallbackValidatorControl;
  let orderMatcher: VietQrOrderMatcherControl;
  let transactionFactory: VietQrPaymentTransactionFactory;
  let transactionSyncControl: VietQrTransactionSyncControl;

  let jwtServiceMock: jest.Mocked<JwtService>;
  let notificationServiceMock: jest.Mocked<NotificationService>;
  let paymentTransactionRepoMock: jest.Mocked<Repository<PaymentTransaction>>;
  let orderRepoMock: jest.Mocked<Repository<Order>>;

  beforeEach(async () => {
    jwtServiceMock = {
      verify: jest.fn(),
      sign: jest.fn(),
    } as any;

    notificationServiceMock = {
      sendPaymentSuccessNotification: jest.fn(),
    } as any;

    paymentTransactionRepoMock = {
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    } as any;

    orderRepoMock = {
      find: jest.fn(),
      save: jest.fn((x) => Promise.resolve(x)),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VietQrCallbackValidatorControl,
        VietQrOrderMatcherControl,
        VietQrPaymentTransactionFactory,
        VietQrTransactionSyncControl,
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        {
          provide: getRepositoryToken(PaymentTransaction),
          useValue: paymentTransactionRepoMock,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepoMock,
        },
      ],
    }).compile();

    callbackValidator = module.get<VietQrCallbackValidatorControl>(VietQrCallbackValidatorControl);
    orderMatcher = module.get<VietQrOrderMatcherControl>(VietQrOrderMatcherControl);
    transactionFactory = module.get<VietQrPaymentTransactionFactory>(VietQrPaymentTransactionFactory);
    transactionSyncControl = module.get<VietQrTransactionSyncControl>(VietQrTransactionSyncControl);
  });

  describe('VietQrCallbackValidatorControl', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should validate callback token successfully', () => {
      process.env.JWT_SECRET = 'test-secret';
      jwtServiceMock.verify.mockReturnValue({});
      const result = callbackValidator.validateCallbackToken('valid-token');
      expect(result).toBe(true);
      expect(jwtServiceMock.verify).toHaveBeenCalledWith('valid-token', { secret: 'test-secret' });
    });

    it('should return false if token verification fails', () => {
      process.env.JWT_SECRET = 'test-secret';
      jwtServiceMock.verify.mockImplementation(() => {
        throw new Error('Verification failed');
      });
      const result = callbackValidator.validateCallbackToken('invalid-token');
      expect(result).toBe(false);
    });

    it('should return false if JWT_SECRET is not configured', () => {
      delete process.env.JWT_SECRET;
      const result = callbackValidator.validateCallbackToken('some-token');
      expect(result).toBe(false);
    });

    it('should generate JWT token with correct credentials', () => {
      process.env.CLIENT_USERNAME = 'user';
      process.env.CLIENT_PASSWORD = 'pass';
      process.env.JWT_SECRET = 'secret';
      jwtServiceMock.sign.mockReturnValue('jwt-token');

      const response = callbackValidator.generateJWTToken('user', 'pass');
      expect(response).toEqual({
        access_token: 'jwt-token',
        token_type: 'Bearer',
        expires_in: 300,
      });
      expect(jwtServiceMock.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException with incorrect credentials', () => {
      process.env.CLIENT_USERNAME = 'user';
      process.env.CLIENT_PASSWORD = 'pass';
      process.env.JWT_SECRET = 'secret';

      expect(() => {
        callbackValidator.generateJWTToken('wrong-user', 'wrong-pass');
      }).toThrow(UnauthorizedException);
    });

    it('should throw InternalServerErrorException if JWT_SECRET is missing during sign', () => {
      process.env.CLIENT_USERNAME = 'user';
      process.env.CLIENT_PASSWORD = 'pass';
      delete process.env.JWT_SECRET;

      expect(() => {
        callbackValidator.generateJWTToken('user', 'pass');
      }).toThrow(InternalServerErrorException);
    });
  });

  describe('VietQrOrderMatcherControl', () => {
    it('should find matching order successfully', async () => {
      const mockOrder1 = { orderId: 'order-1', totalAmount: 100 } as Order;
      const mockOrder2 = { orderId: 'order-2', totalAmount: 200 } as Order;
      orderRepoMock.find.mockResolvedValue([mockOrder1, mockOrder2]);

      const callbackDto: TransactionCallbackDto = {
        transactionid: 'tx-1',
        transactiontime: 123456,
        referencenumber: 'ref-1',
        amount: 200,
        content: 'AIMS order2', // matches short ID or content
        bankaccount: 'bank-1',
        orderId: 'order-2',
      };

      const result = await orderMatcher.matchOrder(callbackDto);
      expect(result).toBeDefined();
      expect(result?.orderId).toBe('order-2');
    });

    it('should return null if no order matches', async () => {
      const mockOrder1 = { orderId: 'order-1', totalAmount: 100 } as Order;
      orderRepoMock.find.mockResolvedValue([mockOrder1]);

      const callbackDto: TransactionCallbackDto = {
        transactionid: 'tx-1',
        transactiontime: 123456,
        referencenumber: 'ref-1',
        amount: 200,
        content: 'WRONG CONTENT',
        bankaccount: 'bank-1',
        orderId: 'wrong-id',
      };

      const result = await orderMatcher.matchOrder(callbackDto);
      expect(result).toBeNull();
    });
  });

  describe('VietQrPaymentTransactionFactory', () => {
    it('should create PaymentTransaction correctly', () => {
      const mockOrder = { orderId: 'order-1' } as Order;
      const body: TransactionCallbackDto = {
        transactionid: 'tx-1',
        transactiontime: 123456,
        referencenumber: 'ref-1',
        amount: 100,
        content: 'AIMS order-1',
        bankaccount: 'bank-1',
      };

      const transaction = transactionFactory.createPaymentTransaction(mockOrder, body, 'ref-1', 'aims-txn-1');
      expect(transaction).toBeDefined();
      expect(paymentTransactionRepoMock.create).toHaveBeenCalled();
    });
  });

  describe('VietQrTransactionSyncControl', () => {
    it('should successfully sync transaction, update order, and send email successfully', async () => {
      const mockOrder = {
        orderId: 'order-123',
        totalAmount: 150000,
        status: 'PENDING',
        deliveryInfo: { email: 'customer@example.com' },
      } as unknown as Order;

      jest.spyOn(orderMatcher, 'matchOrder').mockResolvedValue(mockOrder);
      const paymentTxMock = {
        paymentTransactionId: 'pt-123',
        receiptEmailSentAt: undefined,
        receiptEmailError: undefined,
      } as any;
      jest.spyOn(transactionFactory, 'createPaymentTransaction').mockReturnValue(paymentTxMock);

      const callbackDto: TransactionCallbackDto = {
        transactionid: 'tx-123',
        transactiontime: 123456,
        referencenumber: 'ref-123',
        amount: 150000,
        content: 'AIMS order123',
        bankaccount: 'bank-123',
        orderId: 'order123',
      };

      const callSequence: string[] = [];
      paymentTransactionRepoMock.save.mockImplementation((tx: any) => {
        callSequence.push(`save_tx_${tx.paymentTransactionId || 'new'}`);
        return Promise.resolve(tx);
      });
      orderRepoMock.save.mockImplementation((ord: any) => {
        callSequence.push(`save_order_${ord.orderId}`);
        return Promise.resolve(ord);
      });
      notificationServiceMock.sendPaymentSuccessNotification.mockImplementation(async () => {
        callSequence.push('send_email');
        return Promise.resolve();
      });

      const result = await transactionSyncControl.syncTransaction(callbackDto);

      expect(result).toHaveProperty('refTransactionId');
      expect(mockOrder.status).toBe('PENDING_PROCESSING');
      
      // Verify sequence of operations:
      // 1. Save initial payment transaction
      // 2. Save updated order status (PENDING_PROCESSING)
      // 3. Send payment success notification email
      // 4. Save updated receipt email info to payment transaction
      expect(callSequence).toEqual([
        'save_tx_pt-123',
        'save_order_order-123',
        'send_email',
        'save_tx_pt-123',
      ]);
      expect(paymentTxMock.receiptEmailSentAt).toBeDefined();
      expect(paymentTxMock.receiptEmailError).toBeNull();
    });

    it('should handle email delivery failure but still succeed transaction sync', async () => {
      const mockOrder = {
        orderId: 'order-123',
        totalAmount: 150000,
        status: 'PENDING',
        deliveryInfo: { email: 'customer@example.com' },
      } as unknown as Order;

      jest.spyOn(orderMatcher, 'matchOrder').mockResolvedValue(mockOrder);
      const paymentTxMock = {
        paymentTransactionId: 'pt-123',
        receiptEmailSentAt: undefined,
        receiptEmailError: undefined,
      } as any;
      jest.spyOn(transactionFactory, 'createPaymentTransaction').mockReturnValue(paymentTxMock);

      const callbackDto: TransactionCallbackDto = {
        transactionid: 'tx-123',
        transactiontime: 123456,
        referencenumber: 'ref-123',
        amount: 150000,
        content: 'AIMS order123',
        bankaccount: 'bank-123',
        orderId: 'order123',
      };

      const callSequence: string[] = [];
      paymentTransactionRepoMock.save.mockImplementation((tx: any) => {
        callSequence.push(`save_tx_${tx.paymentTransactionId || 'new'}`);
        return Promise.resolve(tx);
      });
      orderRepoMock.save.mockImplementation((ord: any) => {
        callSequence.push(`save_order_${ord.orderId}`);
        return Promise.resolve(ord);
      });
      notificationServiceMock.sendPaymentSuccessNotification.mockImplementation(async () => {
        callSequence.push('send_email');
        throw new Error('SMTP error');
      });

      const result = await transactionSyncControl.syncTransaction(callbackDto);

      expect(result).toHaveProperty('refTransactionId');
      expect(mockOrder.status).toBe('PENDING_PROCESSING');
      
      // Verify sequence of operations for failed email:
      // 1. Save initial payment transaction
      // 2. Save updated order status (PENDING_PROCESSING)
      // 3. Attempt to send payment success notification email (fails)
      // 4. Save updated receipt email failure error details to payment transaction
      expect(callSequence).toEqual([
        'save_tx_pt-123',
        'save_order_order-123',
        'send_email',
        'save_tx_pt-123',
      ]);
      expect(paymentTxMock.receiptEmailSentAt).toBeUndefined();
      expect(paymentTxMock.receiptEmailError).toBe('SMTP error');
    });

    it('should throw error when order not found', async () => {
      jest.spyOn(orderMatcher, 'matchOrder').mockResolvedValue(null);

      const callbackDto: TransactionCallbackDto = {
        transactionid: 'tx-123',
        transactiontime: 123456,
        referencenumber: 'ref-123',
        amount: 150000,
        content: 'AIMS order123',
        bankaccount: 'bank-123',
        orderId: 'order123',
      };

      await expect(transactionSyncControl.syncTransaction(callbackDto)).rejects.toThrow('Order not found for orderId: order123');
    });

    it('should throw error when amount mismatch', async () => {
      const mockOrder = {
        orderId: 'order-123',
        totalAmount: 150000,
        status: 'PENDING',
      } as unknown as Order;

      jest.spyOn(orderMatcher, 'matchOrder').mockResolvedValue(mockOrder);

      const callbackDto: TransactionCallbackDto = {
        transactionid: 'tx-123',
        transactiontime: 123456,
        referencenumber: 'ref-123',
        amount: 100000, // Expected 150000
        content: 'AIMS order123',
        bankaccount: 'bank-123',
        orderId: 'order123',
      };

      await expect(transactionSyncControl.syncTransaction(callbackDto)).rejects.toThrow('Amount mismatch');
    });
  });
});
