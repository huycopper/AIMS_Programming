import { Test, TestingModule } from '@nestjs/testing';
import { PayThroughVietQrService } from './pay-through-viet-qr.service';
import { OrderService } from '../../order/order.service';
import { VietQrService } from '../../boundaries/viet-qr/viet-qr.service';
import { BadRequestException } from '@nestjs/common';

describe('PayThroughVietQrService', () => {
  let service: PayThroughVietQrService;
  let orderService: jest.Mocked<OrderService>;
  let vietQrService: jest.Mocked<VietQrService>;

  beforeEach(async () => {
    const mockOrderService = {
      createOrder: jest.fn(),
      updateOrderStatus: jest.fn(),
    };

    const mockVietQrService = {
      generateQRCode: jest.fn(),
      verifyPaymentCallback: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayThroughVietQrService,
        { provide: OrderService, useValue: mockOrderService },
        { provide: VietQrService, useValue: mockVietQrService },
      ],
    }).compile();

    service = module.get<PayThroughVietQrService>(PayThroughVietQrService);
    orderService = module.get(OrderService);
    vietQrService = module.get(VietQrService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processPayment', () => {
    it('should create order and return QR code', async () => {
      const invoiceData = { subtotal: 100, totalAmount: 110 };
      const createdOrder = { orderId: 'ord-123', totalAmount: 110 } as any;
      orderService.createOrder.mockResolvedValue(createdOrder);
      vietQrService.generateQRCode.mockResolvedValue('data:image/png;base64,mockqr');

      const result = await service.processPayment(invoiceData);

      expect(orderService.createOrder).toHaveBeenCalledWith(invoiceData);
      expect(vietQrService.generateQRCode).toHaveBeenCalledWith(110, 'ord-123');
      expect(result).toEqual({
        orderId: 'ord-123',
        qrCodeUrl: 'data:image/png;base64,mockqr',
      });
    });
  });

  describe('handleCallback', () => {
    it('should throw if webhook signature is invalid', async () => {
      vietQrService.verifyPaymentCallback.mockReturnValue(false);

      await expect(service.handleCallback({}))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw if order ID not found in payload', async () => {
      vietQrService.verifyPaymentCallback.mockReturnValue(true);

      await expect(service.handleCallback({ content: 'random stuff' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should update order status if valid', async () => {
      vietQrService.verifyPaymentCallback.mockReturnValue(true);

      const result = await service.handleCallback({ content: 'Payment for order ord-999' });

      expect(orderService.updateOrderStatus).toHaveBeenCalledWith('ord-999', 'PENDING_PROCESSING');
      expect(result).toEqual({ success: true });
    });
  });
});
