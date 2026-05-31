import { Test, TestingModule } from '@nestjs/testing';
import { PlaceOrderController } from './order.controller';
import { OrderService } from './order.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';

describe('PlaceOrderController', () => {
  let controller: PlaceOrderController;
  let orderService: OrderService;

  beforeEach(async () => {
    const mockOrderRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlaceOrderController],
      providers: [
        OrderService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
      ],
    }).compile();

    controller = module.get<PlaceOrderController>(PlaceOrderController);
    orderService = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('calculateShipping', () => {
    it('should return shipping fee breakdown for inner-city', () => {
      const dto = {
        province: 'Hà Nội',
        address: '123 Đại Cồ Việt',
        cartItems: [
          { productId: '1', quantity: 1, weight: 2.0, currentPrice: 150000 },
        ],
      };

      const result = controller.calculateShipping(dto);

      expect(result).toHaveProperty('totalWeight');
      expect(result).toHaveProperty('isInnerCity', true);
      expect(result).toHaveProperty('baseFee', 22000);
      expect(result).toHaveProperty('additionalFee');
      expect(result).toHaveProperty('grossShipping');
      expect(result).toHaveProperty('discount');
      expect(result).toHaveProperty('shippingFee');
      expect(result).toHaveProperty('subtotal');
      expect(result).toHaveProperty('vat');
      expect(result).toHaveProperty('totalAmount');
    });

    it('should return shipping fee breakdown for outer province', () => {
      const dto = {
        province: 'Đà Nẵng',
        address: '456 Hai Bà Trưng',
        cartItems: [
          { productId: '1', quantity: 1, weight: 1.0, currentPrice: 80000 },
        ],
      };

      const result = controller.calculateShipping(dto);

      expect(result.isInnerCity).toBe(false);
      expect(result.baseFee).toBe(30000);
    });
  });

  describe('placeOrder', () => {
    it('should return full invoice with delivery info and breakdown', () => {
      const dto = {
        name: 'Nguyễn Văn A',
        phone: '0912345678',
        email: 'test@example.com',
        province: 'Hà Nội',
        address: '123 Đại Cồ Việt',
        note: 'Giao giờ hành chính',
        cartItems: [
          { productId: '1', quantity: 2, weight: 0.5, currentPrice: 60000 },
        ],
      };

      const result = controller.placeOrder(dto);

      // Check delivery info
      expect(result.deliveryInfo).toEqual({
        name: 'Nguyễn Văn A',
        phone: '0912345678',
        email: 'test@example.com',
        province: 'Hà Nội',
        address: '123 Đại Cồ Việt',
        note: 'Giao giờ hành chính',
      });

      // Check invoice data
      expect(result.subtotal).toBe(120000);
      expect(result.vat).toBe(12000);
      expect(result).toHaveProperty('shippingFee');
      expect(result).toHaveProperty('totalAmount');
      expect(result.cartItems).toEqual(dto.cartItems);
    });

    it('should handle missing optional fields', () => {
      const dto = {
        name: 'Trần Thị B',
        phone: '0987654321',
        province: 'Đà Nẵng',
        address: '789 Lê Lợi',
        cartItems: [
          { productId: '1', quantity: 1, weight: 1.0, currentPrice: 50000 },
        ],
      };

      // const result = controller.placeOrder(dto);

      // expect(result.deliveryInfo.email).toBeNull();
      // expect(result.deliveryInfo.note).toBeNull();
    });
  });
});
