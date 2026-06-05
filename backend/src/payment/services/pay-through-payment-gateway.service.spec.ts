import { Test, TestingModule } from '@nestjs/testing';
import { PayThroughPaymentGatewayController } from './pay-through-payment-gateway.service.js';
import { VietQRBoundary } from '../../boundaries/viet-qr/viet-qr.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentTransaction } from '../entities/payment-transaction.entity.js';
import { Order } from '../../order/entities/order.entity.js';

describe('PayThroughPaymentGatewayController', () => {
  let service: PayThroughPaymentGatewayController;
  let vietQRBoundary: jest.Mocked<VietQRBoundary>;
  let orderRepo: any;
  let paymentTxRepo: any;

  beforeEach(async () => {
    const vietQRMock = {
      getAccessToken: jest.fn(),
      generateQRCode: jest.fn(),
      postAPICallback: jest.fn(),
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

  describe('generateQRCode', () => {
    it('should get access token and generate QR code', async () => {
      const mockOrder = { orderId: 'ord-123', totalAmount: 100000 } as Order;
      const mockToken = 'test-access-token';
      const mockQrResult = { qrDataURL: 'data:image/png;base64,...', amount: 100000, content: 'AIMS ord123' };

      vietQRBoundary.getAccessToken.mockResolvedValue(mockToken);
      vietQRBoundary.generateQRCode.mockResolvedValue(mockQrResult);

      const result = await service.generateQRCode(mockOrder);

      expect(vietQRBoundary.getAccessToken).toHaveBeenCalled();
      expect(vietQRBoundary.generateQRCode).toHaveBeenCalledWith(mockOrder, mockToken);
      expect(result).toEqual(mockQrResult);
    });
  });

  describe('confirmPayment', () => {
    it('should call handleAPICallback and return payment result', async () => {
      const mockOrder = { orderId: 'ord-123', totalAmount: 100000 } as Order;
      const mockToken = 'test-access-token';
      const mockCallbackResult = { status: 'SUCCESS', message: '' };

      vietQRBoundary.getAccessToken.mockResolvedValue(mockToken);
      vietQRBoundary.postAPICallback.mockResolvedValue(mockCallbackResult);

      const result = await service.confirmPayment(mockOrder);

      expect(vietQRBoundary.getAccessToken).toHaveBeenCalled();
      expect(vietQRBoundary.postAPICallback).toHaveBeenCalledWith(mockOrder, mockToken);
      expect(result).toEqual({
        status: 'SUCCESS',
        message: '',
        orderId: 'ord-123',
      });
    });

    it('should propagate error if postAPICallback fails', async () => {
      const mockOrder = { orderId: 'ord-123', totalAmount: 100000 } as Order;

      vietQRBoundary.getAccessToken.mockResolvedValue('test-token');
      vietQRBoundary.postAPICallback.mockRejectedValue(new Error('VietQR API error'));

      await expect(service.confirmPayment(mockOrder)).rejects.toThrow('VietQR API error');
    });
  });

  describe('handleAPICallback', () => {
    it('should get access token and call postAPICallback', async () => {
      const mockOrder = { orderId: 'ord-123', totalAmount: 100000 } as Order;
      const mockToken = 'test-access-token';
      const mockResult = { status: 'SUCCESS', message: '' };

      vietQRBoundary.getAccessToken.mockResolvedValue(mockToken);
      vietQRBoundary.postAPICallback.mockResolvedValue(mockResult);

      const result = await service.handleAPICallback(mockOrder);

      expect(vietQRBoundary.getAccessToken).toHaveBeenCalled();
      expect(vietQRBoundary.postAPICallback).toHaveBeenCalledWith(mockOrder, mockToken);
      expect(result).toEqual(mockResult);
    });
  });
});
