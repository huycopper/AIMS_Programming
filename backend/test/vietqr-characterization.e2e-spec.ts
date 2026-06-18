/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, DeliveryInfo } from '../src/order/entities/order.entity.js';
import { PaymentTransaction } from '../src/payment/entities/payment-transaction.entity.js';
import { EmailService } from '../src/notification/email/email.service.js';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { EmailBoundary } from '../src/pay-order/notification/boundary/email/email.boundary.js';

describe('VietQR Flow Characterization (e2e)', () => {
  let app: INestApplication<App>;
  let orderRepo: Repository<Order>;
  let deliveryInfoRepo: Repository<DeliveryInfo>;
  let paymentTransactionRepo: Repository<PaymentTransaction>;
  let emailService: EmailService;
  let emailBoundary: EmailBoundary;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(8080);

    orderRepo = moduleFixture.get<Repository<Order>>(getRepositoryToken(Order));
    deliveryInfoRepo = moduleFixture.get<Repository<DeliveryInfo>>(
      getRepositoryToken(DeliveryInfo),
    );
    paymentTransactionRepo = moduleFixture.get<Repository<PaymentTransaction>>(
      getRepositoryToken(PaymentTransaction),
    );
    emailService = moduleFixture.get<EmailService>(EmailService);
    emailBoundary = moduleFixture.get<EmailBoundary>(EmailBoundary);
    configService = moduleFixture.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('JWT Token Generation (/vqr/api/token_generate)', () => {
    it('should generate a Bearer token with valid Basic Auth', async () => {
      const username = process.env.CLIENT_USERNAME || 'aims1234';
      const password = process.env.CLIENT_PASSWORD || 'password';
      const credentials = Buffer.from(`${username}:${password}`).toString(
        'base64',
      );

      const response = await request(app.getHttpServer())
        .post('/vqr/api/token_generate')
        .set('Authorization', `Basic ${credentials}`)
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('token_type', 'Bearer');
      expect(response.body).toHaveProperty('expires_in');
    });

    it('should return 401 Unauthorized with invalid credentials', async () => {
      const credentials = Buffer.from('invalid:wrong').toString('base64');

      await request(app.getHttpServer())
        .post('/vqr/api/token_generate')
        .set('Authorization', `Basic ${credentials}`)
        .expect(401);
    });

    it('should return 400 Bad Request with missing Auth header', async () => {
      await request(app.getHttpServer())
        .post('/vqr/api/token_generate')
        .expect(400);
    });
  });

  describe('Order Payment Operations', () => {
    let testOrder: Order;

    beforeEach(async () => {
      // Create a clean order for testing
      const deliveryInfo = deliveryInfoRepo.create({
        name: 'John Doe',
        phone: '0912345678',
        email: 'john.doe@example.com',
        province: 'Hà Nội',
        address: '123 Test Street',
        note: 'Deliver fast',
      });

      testOrder = orderRepo.create({
        orderId: randomUUID(),
        deliveryInfo,
        subtotal: 100000,
        vat: 10000,
        shippingFee: 22000,
        totalAmount: 132000,
        totalWeight: 1.5,
        status: 'PENDING',
        orderViewToken: 'view-' + randomUUID(),
        cancelToken: 'cancel-' + randomUUID(),
      });

      await orderRepo.save(testOrder);
    });

    afterEach(async () => {
      // Cleanup transactions and orders
      if (testOrder) {
        await paymentTransactionRepo.delete({
          order: { orderId: testOrder.orderId },
        });
        await orderRepo.delete({ orderId: testOrder.orderId });
        if (testOrder.deliveryInfo) {
          await deliveryInfoRepo.delete({
            deliveryInfoId: testOrder.deliveryInfo.deliveryInfoId,
          });
        }
      }
    });

    describe('QR Generation (POST /api/payment/pay-order/:orderId)', () => {
      it('should generate QR code successfully', async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/payment/pay-order/${testOrder.orderId}`)
          .expect(201);

        expect(response.body).toHaveProperty('qrDataURL');
        expect(response.body.qrDataURL).toContain('data:image/png;base64');
        expect(response.body).toHaveProperty('amount', 132000);
        expect(response.body).toHaveProperty('content');
        expect(response.body.content).toContain('AIMS');
      });

      it('should return 400 Bad Request if order not found', async () => {
        await request(app.getHttpServer())
          .post(`/api/payment/pay-order/${randomUUID()}`)
          .expect(400);
      });
    });

    describe('Payment Polling Status (GET /api/payment/pay-order/:orderId/confirmation)', () => {
      it('should return PENDING status when no transaction recorded', async () => {
        const response = await request(app.getHttpServer())
          .get(`/api/payment/pay-order/${testOrder.orderId}/confirmation`)
          .expect(200);

        expect(response.body).toHaveProperty('status', 'PENDING');
        expect(response.body).toHaveProperty(
          'message',
          'Payment transaction has not been recorded yet.',
        );
        expect(response.body).toHaveProperty('orderId', testOrder.orderId);
      });

      it('should return SUCCESS status when a transaction is completed', async () => {
        // Mock a success transaction
        const txn = paymentTransactionRepo.create({
          order: testOrder,
          transactionRef: 'REF123',
          amount: 132000,
          paymentMethod: 'VIETQR',
          status: 'SUCCESS',
        });
        await paymentTransactionRepo.save(txn);

        const response = await request(app.getHttpServer())
          .get(`/api/payment/pay-order/${testOrder.orderId}/confirmation`)
          .expect(200);

        expect(response.body).toHaveProperty('status', 'SUCCESS');
        expect(response.body).toHaveProperty(
          'message',
          'Payment confirmed successfully.',
        );
        expect(response.body).toHaveProperty('transaction');
        expect(response.body.transaction).toHaveProperty('status', 'SUCCESS');
        expect(Number(response.body.transaction.amount)).toBe(132000);
      });
    });

    describe('Confirm Payment (POST /api/payment/pay-order/:orderId/confirm)', () => {
      it('should initiate payment confirmation and return PENDING_CONFIRMATION if webhook not received yet', async () => {
        const response = await request(app.getHttpServer())
          .post(`/api/payment/pay-order/${testOrder.orderId}/confirm`)
          .expect(201);

        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toMatch(/PENDING_CONFIRMATION|SUCCESS/);
      }, 15000); // 15s timeout because of internal confirm polling delay
    });

    describe('Transaction Sync (POST /vqr/bank/api/transaction-sync)', () => {
      let token: string;

      beforeEach(async () => {
        // Obtain token for transaction sync auth
        const username = process.env.CLIENT_USERNAME || 'aims1234';
        const password = process.env.CLIENT_PASSWORD || 'password';
        const credentials = Buffer.from(`${username}:${password}`).toString(
          'base64',
        );

        const tokenRes = await request(app.getHttpServer())
          .post('/vqr/api/token_generate')
          .set('Authorization', `Basic ${credentials}`);

        token = tokenRes.body.access_token;
      });

      it('should successfully sync transaction, update order, and send email successfully', async () => {
        // Spy on email send
        const sendEmailSpy = jest.spyOn(emailBoundary, 'sendEmail');

        const shortOrderId = testOrder.orderId
          .replace(/-/g, '')
          .substring(0, 13);
        const payload = {
          transactionid: 'TXN-' + randomUUID().substring(0, 8),
          transactiontime: Date.now(),
          referencenumber: 'REF-' + randomUUID().substring(0, 8),
          amount: 132000,
          content: `AIMS ${shortOrderId}`,
          bankaccount: '999990977777',
          orderId: shortOrderId,
        };

        const response = await request(app.getHttpServer())
          .post('/vqr/bank/api/transaction-sync')
          .set('Authorization', `Bearer ${token}`)
          .send(payload)
          .expect(200);

        // Assert success response shape
        expect(response.body).toEqual({
          error: false,
          errorReason: null,
          toastMessage: 'Transaction processed successfully',
          object: {
            reftransactionid: expect.stringMatching(
              /^AIMS_TXN_\d+_[a-f0-9]{8}$/,
            ),
          },
        });

        // Check database changes
        const updatedOrder = await orderRepo.findOne({
          where: { orderId: testOrder.orderId },
        });
        expect(updatedOrder?.status).toBe('PENDING_PROCESSING');

        const txn = await paymentTransactionRepo.findOne({
          where: { order: { orderId: testOrder.orderId } },
        });
        expect(txn).toBeDefined();
        expect(txn?.status).toBe('SUCCESS');
        expect(Number(txn?.amount)).toBe(132000);

        // Verify receipt email sent behavior (receiptEmailSentAt set and receiptEmailError cleared on success)
        expect(txn?.receiptEmailSentAt).toBeDefined();
        expect(txn?.receiptEmailSentAt).not.toBeNull();
        expect(txn?.receiptEmailError).toBeNull();

        // Verify email builder and APP_PUBLIC_URL link behavior without exposing env secrets
        expect(sendEmailSpy).toHaveBeenCalledTimes(1);
        const [message] = sendEmailSpy.mock.calls[0];
        const { to, subject, html, text } = message;
        expect(to).toBe(testOrder.deliveryInfo.email);
        expect(subject).toBe(
          `[AIMS] Payment Successful - Order #${testOrder.orderId}`,
        );

        const appPublicUrl = configService.get<string>(
          'APP_PUBLIC_URL',
          'http://localhost:4200',
        );
        expect(html).toContain(
          `${appPublicUrl}/orders/view/${testOrder.orderViewToken}`,
        );
        expect(html).toContain(
          `${appPublicUrl}/orders/cancel/${testOrder.cancelToken}`,
        );
        expect(text).toContain(
          `${appPublicUrl}/orders/view/${testOrder.orderViewToken}`,
        );
        expect(text).toContain(
          `${appPublicUrl}/orders/cancel/${testOrder.cancelToken}`,
        );

        sendEmailSpy.mockRestore();
      });

      it('should handle email delivery failure but still succeed transaction sync', async () => {
        // Mock sendEmail to throw an error
        const sendEmailSpy = jest
          .spyOn(emailBoundary, 'sendEmail')
          .mockRejectedValue(new Error('SMTP failure'));

        const shortOrderId = testOrder.orderId
          .replace(/-/g, '')
          .substring(0, 13);
        const payload = {
          transactionid: 'TXN-' + randomUUID().substring(0, 8),
          transactiontime: Date.now(),
          referencenumber: 'REF-' + randomUUID().substring(0, 8),
          amount: 132000,
          content: `AIMS ${shortOrderId}`,
          bankaccount: '999990977777',
          orderId: shortOrderId,
        };

        const response = await request(app.getHttpServer())
          .post('/vqr/bank/api/transaction-sync')
          .set('Authorization', `Bearer ${token}`)
          .send(payload)
          .expect(200);

        // Email failure does not change transaction-sync success response shape
        expect(response.body).toEqual({
          error: false,
          errorReason: null,
          toastMessage: 'Transaction processed successfully',
          object: {
            reftransactionid: expect.stringMatching(
              /^AIMS_TXN_\d+_[a-f0-9]{8}$/,
            ),
          },
        });

        // Email failure does not roll back order status PENDING_PROCESSING
        const updatedOrder = await orderRepo.findOne({
          where: { orderId: testOrder.orderId },
        });
        expect(updatedOrder?.status).toBe('PENDING_PROCESSING');

        // Email failure does not roll back PaymentTransaction persistence, and saves receiptEmailError
        const txn = await paymentTransactionRepo.findOne({
          where: { order: { orderId: testOrder.orderId } },
        });
        expect(txn).toBeDefined();
        expect(txn?.status).toBe('SUCCESS');
        expect(txn?.receiptEmailSentAt).toBeNull();
        expect(txn?.receiptEmailError).toBe('SMTP failure');

        sendEmailSpy.mockRestore();
      });

      it('should succeed transaction sync when order has no delivery email', async () => {
        // Update order to have no delivery email (empty string/null)
        testOrder.deliveryInfo.email = '';
        await deliveryInfoRepo.save(testOrder.deliveryInfo);

        const sendEmailSpy = jest.spyOn(emailBoundary, 'sendEmail');

        const shortOrderId = testOrder.orderId
          .replace(/-/g, '')
          .substring(0, 13);
        const payload = {
          transactionid: 'TXN-' + randomUUID().substring(0, 8),
          transactiontime: Date.now(),
          referencenumber: 'REF-' + randomUUID().substring(0, 8),
          amount: 132000,
          content: `AIMS ${shortOrderId}`,
          bankaccount: '999990977777',
          orderId: shortOrderId,
        };

        const response = await request(app.getHttpServer())
          .post('/vqr/bank/api/transaction-sync')
          .set('Authorization', `Bearer ${token}`)
          .send(payload)
          .expect(200);

        expect(response.body).toEqual({
          error: false,
          errorReason: null,
          toastMessage: 'Transaction processed successfully',
          object: {
            reftransactionid: expect.stringMatching(
              /^AIMS_TXN_\d+_[a-f0-9]{8}$/,
            ),
          },
        });

        const updatedOrder = await orderRepo.findOne({
          where: { orderId: testOrder.orderId },
        });
        expect(updatedOrder?.status).toBe('PENDING_PROCESSING');

        const txn = await paymentTransactionRepo.findOne({
          where: { order: { orderId: testOrder.orderId } },
        });
        expect(txn).toBeDefined();
        // Since no email address was provided, sendEmail should not be called,
        // but receiptEmailSentAt is set and receiptEmailError is null (same as successful notification flow)
        expect(sendEmailSpy).not.toHaveBeenCalled();
        expect(txn?.receiptEmailSentAt).toBeDefined();
        expect(txn?.receiptEmailSentAt).not.toBeNull();
        expect(txn?.receiptEmailError).toBeNull();

        sendEmailSpy.mockRestore();
      });

      it('should simulate sending email when EMAIL_ENABLED=false', async () => {
        // Mock ConfigService.get to return 'false' for EMAIL_ENABLED
        const originalGet = configService.get.bind(configService);
        const configGetSpy = jest
          .spyOn(configService, 'get')
          .mockImplementation((key: string, ...args: any[]) => {
            if (key === 'EMAIL_ENABLED') {
              return 'false';
            }
            return originalGet(key, ...args);
          });

        // Verify that nodemailer transporter.sendMail is not called
        const transporterSendMailSpy = jest.spyOn(
          (emailBoundary as any).transporter,
          'sendMail',
        );

        const shortOrderId = testOrder.orderId
          .replace(/-/g, '')
          .substring(0, 13);
        const payload = {
          transactionid: 'TXN-' + randomUUID().substring(0, 8),
          transactiontime: Date.now(),
          referencenumber: 'REF-' + randomUUID().substring(0, 8),
          amount: 132000,
          content: `AIMS ${shortOrderId}`,
          bankaccount: '999990977777',
          orderId: shortOrderId,
        };

        const response = await request(app.getHttpServer())
          .post('/vqr/bank/api/transaction-sync')
          .set('Authorization', `Bearer ${token}`)
          .send(payload)
          .expect(200);

        expect(response.body).toEqual({
          error: false,
          errorReason: null,
          toastMessage: 'Transaction processed successfully',
          object: {
            reftransactionid: expect.stringMatching(
              /^AIMS_TXN_\d+_[a-f0-9]{8}$/,
            ),
          },
        });

        const updatedOrder = await orderRepo.findOne({
          where: { orderId: testOrder.orderId },
        });
        expect(updatedOrder?.status).toBe('PENDING_PROCESSING');

        const txn = await paymentTransactionRepo.findOne({
          where: { order: { orderId: testOrder.orderId } },
        });
        expect(txn).toBeDefined();
        // Since EMAIL_ENABLED=false, the sendEmail call simulates and resolves successfully
        expect(txn?.receiptEmailSentAt).toBeDefined();
        expect(txn?.receiptEmailSentAt).not.toBeNull();
        expect(txn?.receiptEmailError).toBeNull();

        // nodemailer sendMail should NOT be called
        expect(transporterSendMailSpy).not.toHaveBeenCalled();

        transporterSendMailSpy.mockRestore();
        configGetSpy.mockRestore();
      });

      it('should fail transaction sync with invalid/missing token', async () => {
        const shortOrderId = testOrder.orderId
          .replace(/-/g, '')
          .substring(0, 13);
        const payload = {
          transactionid: 'TXN-123',
          transactiontime: Date.now(),
          referencenumber: 'REF-123',
          amount: 132000,
          content: `AIMS ${shortOrderId}`,
          bankaccount: '999990977777',
          orderId: shortOrderId,
        };

        await request(app.getHttpServer())
          .post('/vqr/bank/api/transaction-sync')
          .set('Authorization', `Bearer invalid-token`)
          .send(payload)
          .expect(401);
      });

      it('should fail transaction sync when amount mismatch', async () => {
        const shortOrderId = testOrder.orderId
          .replace(/-/g, '')
          .substring(0, 13);
        const payload = {
          transactionid: 'TXN-123',
          transactiontime: Date.now(),
          referencenumber: 'REF-123',
          amount: 100000, // Expected 132000
          content: `AIMS ${shortOrderId}`,
          bankaccount: '999990977777',
          orderId: shortOrderId,
        };

        const response = await request(app.getHttpServer())
          .post('/vqr/bank/api/transaction-sync')
          .set('Authorization', `Bearer ${token}`)
          .send(payload)
          .expect(400);

        expect(response.body).toHaveProperty('error', true);
        expect(response.body.errorReason).toBe('TRANSACTION_FAILED');
      });
    });
  });
});
