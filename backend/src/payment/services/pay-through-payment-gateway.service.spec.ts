import { Test, TestingModule } from '@nestjs/testing';
import { PayThroughPaymentGatewayController } from './pay-through-payment-gateway.service.js';
import { VietQRBoundary } from '../../boundaries/viet-qr/viet-qr.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentTransaction } from '../entities/payment-transaction.entity.js';
import { Order } from '../../order/entities/order.entity.js';
import { BadRequestException } from '@nestjs/common';

describe('PayThroughPaymentGatewayController', () => {
  let service: PayThroughPaymentGatewayController;
  let vietQRBoundary: jest.Mocked<VietQRBoundary>;
  let orderRepo: any;
  let paymentTxRepo: any;

  beforeEach(async () => {
    const vietQRMock = {
      getAccessToken: jest.fn(),
      generateQRCode: jest.fn(),
    };

    const orderRepoMock = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const paymentTxRepoMock = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayThroughPaymentGatewayController,
        { provide: VietQRBoundary, useValue: vietQRMock },
        { provide: getRepositoryToken(Order), useValue: orderRepoMock },
        { provide: getRepositoryToken(PaymentTransaction), useValue: paymentTxRepoMock },
      ],
    }).compile();

    service = module.get<PayThroughPaymentGatewayController>(PayThroughPaymentGatewayController);
    vietQRBoundary = module.get(VietQRBoundary);
    orderRepo = module.get(getRepositoryToken(Order));
    paymentTxRepo = module.get(getRepositoryToken(PaymentTransaction));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyCallbackData', () => {
    it('should return false if orderId is missing', () => {
      const payload = { amount: 100000 };
      expect(service.verifyCallbackData(payload)).toBe(false);
    });

    it('should return false if amount is missing', () => {
      const payload = { orderId: 'ord-123' };
      expect(service.verifyCallbackData(payload)).toBe(false);
    });

    it('should return true if both orderId and amount are present', () => {
      const payload = { orderId: 'ord-123', amount: 100000 };
      expect(service.verifyCallbackData(payload)).toBe(true);
    });
  });

  describe('handlePaymentCallback', () => {
    it('should throw BadRequestException if data is invalid', async () => {
      await expect(service.handlePaymentCallback({})).rejects.toThrow(BadRequestException);
    });

    it('should save transaction and update order if valid', async () => {
      const payload = { orderId: 'ord-123', amount: 100000, status: 'success' };
      const mockOrder = { orderId: 'ord-123', status: 'PENDING' };
      
      orderRepo.findOne.mockResolvedValue(mockOrder);
      paymentTxRepo.create.mockReturnValue({ status: 'SUCCESS' });

      await service.handlePaymentCallback(payload);

      expect(paymentTxRepo.create).toHaveBeenCalled();
      expect(paymentTxRepo.save).toHaveBeenCalled();
      expect(mockOrder.status).toBe('PENDING_PROCESSING');
      expect(orderRepo.save).toHaveBeenCalledWith(mockOrder);
    });
  });
});
