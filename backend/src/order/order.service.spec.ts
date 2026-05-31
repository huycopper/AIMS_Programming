import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderService } from './order.service.js';
import { Order } from './entities/order.entity.js';
import { CartItemDto } from './dto/calculate-shipping.dto';

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(async () => {
    const mockOrderRepository = {
      save: jest.fn().mockImplementation((order) => Promise.resolve({ ...order, orderId: 'mock-id' })),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===== isInnerCity tests =====
  describe('isInnerCity', () => {
    it('should return true for "Hà Nội"', () => {
      expect(service.isInnerCity('Hà Nội')).toBe(true);
    });

    it('should return true for "Hanoi" (case-insensitive)', () => {
      expect(service.isInnerCity('Hanoi')).toBe(true);
    });

    it('should return true for "Hồ Chí Minh"', () => {
      expect(service.isInnerCity('Hồ Chí Minh')).toBe(true);
    });

    it('should return true for "HCM"', () => {
      expect(service.isInnerCity('HCM')).toBe(true);
    });

    it('should return true for "TP.HCM"', () => {
      expect(service.isInnerCity('TP.HCM')).toBe(true);
    });

    it('should return false for "Đà Nẵng"', () => {
      expect(service.isInnerCity('Đà Nẵng')).toBe(false);
    });

    it('should return false for "Hải Phòng"', () => {
      expect(service.isInnerCity('Hải Phòng')).toBe(false);
    });

    it('should handle whitespace trimming', () => {
      expect(service.isInnerCity('  Hà Nội  ')).toBe(true);
    });
  });

  // ===== calculateTotalWeight tests =====
  describe('calculateTotalWeight', () => {
    it('should correctly sum weights for multiple items', () => {
      const cartItems: CartItemDto[] = [
        { productId: '1', quantity: 2, weight: 0.5, currentPrice: 50000 },
        { productId: '2', quantity: 1, weight: 1.0, currentPrice: 80000 },
      ];
      // 2*0.5 + 1*1.0 = 2.0
      expect(service.calculateTotalWeight(cartItems)).toBe(2.0);
    });

    it('should return 0 for empty cart', () => {
      expect(service.calculateTotalWeight([])).toBe(0);
    });
  });

  // ===== calculateSubtotal tests =====
  describe('calculateSubtotal', () => {
    it('should correctly sum prices for multiple items', () => {
      const cartItems: CartItemDto[] = [
        { productId: '1', quantity: 2, weight: 0.5, currentPrice: 50000 },
        { productId: '2', quantity: 1, weight: 1.0, currentPrice: 80000 },
      ];
      // 2*50000 + 1*80000 = 180000
      expect(service.calculateSubtotal(cartItems)).toBe(180000);
    });

    it('should return 0 for empty cart', () => {
      expect(service.calculateSubtotal([])).toBe(0);
    });
  });

  // ===== calculateShippingFee tests =====
  describe('calculateShippingFee', () => {
    // --- Inner-city (Hanoi/HCM) ---
    it('should calculate base fee 22,000 VND for Hanoi with weight <= 3kg', () => {
      const cartItems: CartItemDto[] = [
        { productId: '1', quantity: 1, weight: 2.0, currentPrice: 150000 },
      ];
      const result = service.calculateShippingFee('Hà Nội', cartItems);
      expect(result.isInnerCity).toBe(true);
      expect(result.baseFee).toBe(22000);
      expect(result.additionalFee).toBe(0);
      expect(result.grossShipping).toBe(22000);
    });

    it('should calculate additional fee for Hanoi with weight > 3kg', () => {
      // Weight = 4 kg, excess = 1 kg => 2 half-kg units => 2 * 2500 = 5000
      const cartItems: CartItemDto[] = [
        { productId: '1', quantity: 1, weight: 4.0, currentPrice: 150000 },
      ];
      const result = service.calculateShippingFee('Hà Nội', cartItems);
      expect(result.baseFee).toBe(22000);
      expect(result.additionalFee).toBe(5000);
      expect(result.grossShipping).toBe(27000);
    });

    it('should round up partial 0.5kg units for inner-city', () => {
      // Weight = 3.3 kg, excess = 0.3 => ceil(0.3/0.5) = 1 => 1 * 2500 = 2500
      const cartItems: CartItemDto[] = [
        { productId: '1', quantity: 1, weight: 3.3, currentPrice: 150000 },
      ];
      const result = service.calculateShippingFee('Hanoi', cartItems);
      expect(result.additionalFee).toBe(2500);
    });

    // --- Other provinces ---
    it('should calculate base fee 30,000 VND for non-inner-city with weight <= 0.5kg', () => {
      const cartItems: CartItemDto[] = [
        { productId: '1', quantity: 1, weight: 0.3, currentPrice: 150000 },
      ];
      const result = service.calculateShippingFee('Đà Nẵng', cartItems);
      expect(result.isInnerCity).toBe(false);
      expect(result.baseFee).toBe(30000);
      expect(result.additionalFee).toBe(0);
      expect(result.grossShipping).toBe(30000);
    });

    it('should calculate additional fee for non-inner-city with weight > 0.5kg', () => {
      // Weight = 2 kg, excess = 1.5 kg => 3 half-kg units => 3 * 2500 = 7500
      const cartItems: CartItemDto[] = [
        { productId: '1', quantity: 1, weight: 2.0, currentPrice: 150000 },
      ];
      const result = service.calculateShippingFee('Đà Nẵng', cartItems);
      expect(result.baseFee).toBe(30000);
      expect(result.additionalFee).toBe(7500);
      expect(result.grossShipping).toBe(37500);
    });

    // --- Discount ---
    it('should apply discount up to 25,000 VND when subtotal > 100,000 VND', () => {
      const cartItems: CartItemDto[] = [
        { productId: '1', quantity: 1, weight: 2.0, currentPrice: 150000 },
      ];
      const result = service.calculateShippingFee('Hà Nội', cartItems);
      // subtotal = 150000 > 100000 => discount = min(25000, grossShipping)
      expect(result.discount).toBe(Math.min(25000, result.grossShipping));
      expect(result.shippingFee).toBe(result.grossShipping - result.discount);
    });

    it('should NOT apply discount when subtotal <= 100,000 VND', () => {
      const cartItems: CartItemDto[] = [
        { productId: '1', quantity: 1, weight: 0.5, currentPrice: 50000 },
      ];
      const result = service.calculateShippingFee('Hà Nội', cartItems);
      expect(result.discount).toBe(0);
    });

    it('should cap discount at grossShipping when grossShipping < 25,000', () => {
      // Inner city, weight <= 3kg => grossShipping = 22000
      // subtotal = 200000 > 100000 => discount = min(25000, 22000) = 22000
      const cartItems: CartItemDto[] = [
        { productId: '1', quantity: 1, weight: 1.0, currentPrice: 200000 },
      ];
      const result = service.calculateShippingFee('Hà Nội', cartItems);
      expect(result.grossShipping).toBe(22000);
      expect(result.discount).toBe(22000);
      expect(result.shippingFee).toBe(0);
    });

    // --- VAT and Total ---
    it('should calculate 10% VAT on subtotal', () => {
      const cartItems: CartItemDto[] = [
        { productId: '1', quantity: 1, weight: 1.0, currentPrice: 200000 },
      ];
      const result = service.calculateShippingFee('Hà Nội', cartItems);
      expect(result.vat).toBe(20000); // 10% of 200000
    });

    it('should calculate totalAmount = subtotal + VAT + shippingFee', () => {
      const cartItems: CartItemDto[] = [
        { productId: '1', quantity: 2, weight: 0.5, currentPrice: 50000 },
      ];
      const result = service.calculateShippingFee('Đà Nẵng', cartItems);
      // subtotal = 100000, vat = 10000
      // weight = 1.0, non-inner-city => base=30000, excess=0.5, units=1, add=2500
      // grossShipping = 32500, discount = 0 (subtotal not > 100000)
      // total = 100000 + 10000 + 32500 = 142500
      expect(result.subtotal).toBe(100000);
      expect(result.vat).toBe(10000);
      expect(result.grossShipping).toBe(32500);
      expect(result.discount).toBe(0);
      expect(result.shippingFee).toBe(32500);
      expect(result.totalAmount).toBe(142500);
    });

    // --- Edge case: exactly 100,000 VND subtotal ---
    it('should NOT apply discount when subtotal is exactly 100,000 VND', () => {
      const cartItems: CartItemDto[] = [
        { productId: '1', quantity: 1, weight: 1.0, currentPrice: 100000 },
      ];
      const result = service.calculateShippingFee('Hà Nội', cartItems);
      expect(result.discount).toBe(0);
    });

    // --- Edge case: weight exactly at threshold ---
    it('should not charge additional fee when weight is exactly 3kg for inner-city', () => {
      const cartItems: CartItemDto[] = [
        { productId: '1', quantity: 1, weight: 3.0, currentPrice: 50000 },
      ];
      const result = service.calculateShippingFee('Hà Nội', cartItems);
      expect(result.additionalFee).toBe(0);
    });

    it('should not charge additional fee when weight is exactly 0.5kg for outer province', () => {
      const cartItems: CartItemDto[] = [
        { productId: '1', quantity: 1, weight: 0.5, currentPrice: 50000 },
      ];
      const result = service.calculateShippingFee('Đà Nẵng', cartItems);
      expect(result.additionalFee).toBe(0);
    });
  });
});
