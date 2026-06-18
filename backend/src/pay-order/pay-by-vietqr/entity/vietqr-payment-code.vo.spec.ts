import { VietQrPaymentCode } from './vietqr-payment-code.vo.js';
import { Order } from '../../../order/entities/order.entity.js';

describe('VietQrPaymentCode Value Object', () => {
  describe('fromOrder', () => {
    it('should derive short order ID and content from an order correctly', () => {
      const order = {
        orderId: 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6',
        totalAmount: 132000.45,
      } as Order;

      const paymentCode = VietQrPaymentCode.fromOrder(order);

      expect(paymentCode.shortOrderId).toBe('a1b2c3d4e5f67');
      expect(paymentCode.amount).toBe(132000);
      expect(paymentCode.content).toBe('AIMS a1b2c3d4e5f67');
    });

    it('should round total amount correctly', () => {
      const order = {
        orderId: '1234-5678-9012-3456',
        totalAmount: 1234.6,
      } as Order;

      const paymentCode = VietQrPaymentCode.fromOrder(order);
      expect(paymentCode.amount).toBe(1235);
    });
  });

  describe('validateMatches', () => {
    let paymentCode: VietQrPaymentCode;

    beforeEach(() => {
      paymentCode = new VietQrPaymentCode(
        'a1b2c3d4e5f67',
        132000,
        'AIMS a1b2c3d4e5f67',
      );
    });

    it('should pass if amount and content match exactly', () => {
      expect(() => {
        paymentCode.validateMatches(132000, 'AIMS a1b2c3d4e5f67');
      }).not.toThrow();
    });

    it('should pass if amount is string or float but rounds to correct amount', () => {
      expect(() => {
        paymentCode.validateMatches(132000.2, 'AIMS a1b2c3d4e5f67');
      }).not.toThrow();
    });

    it('should pass if callback content contains expected payment content', () => {
      expect(() => {
        paymentCode.validateMatches(
          132000,
          'Chuyen khoan AIMS a1b2c3d4e5f67 de mua hang',
        );
      }).not.toThrow();
    });

    it('should throw if amount mismatch', () => {
      expect(() => {
        paymentCode.validateMatches(100000, 'AIMS a1b2c3d4e5f67');
      }).toThrow('Amount mismatch: expected 132000, received 100000');
    });

    it('should throw if content mismatch', () => {
      expect(() => {
        paymentCode.validateMatches(132000, 'AIMS WRONGCONTENT');
      }).toThrow(
        'Content mismatch: expected content to include AIMS a1b2c3d4e5f67',
      );
    });

    it('should throw if amount is not finite', () => {
      expect(() => {
        paymentCode.validateMatches(NaN, 'AIMS a1b2c3d4e5f67');
      }).toThrow('Invalid transaction amount');
    });
  });

  describe('matchesCallback', () => {
    let paymentCode: VietQrPaymentCode;

    beforeEach(() => {
      paymentCode = new VietQrPaymentCode(
        'a1b2c3d4e5f67',
        132000,
        'AIMS a1b2c3d4e5f67',
      );
    });

    it('should match if full orderId matches callback orderId', () => {
      const match = paymentCode.matchesCallback(
        'full-order-uuid',
        'AIMS a1b2c3d4e5f67',
        'full-order-uuid',
      );
      expect(match).toBe(true);
    });

    it('should match if short orderId matches callback orderId', () => {
      const match = paymentCode.matchesCallback(
        'a1b2c3d4e5f67',
        'some random content',
        'full-order-uuid',
      );
      expect(match).toBe(true);
    });

    it('should match if callback content includes expected payment content', () => {
      const match = paymentCode.matchesCallback(
        undefined,
        'some prefix AIMS a1b2c3d4e5f67 suffix',
        'full-order-uuid',
      );
      expect(match).toBe(true);
    });

    it('should not match if none of the criteria match', () => {
      const match = paymentCode.matchesCallback(
        'other-short-id',
        'AIMS other-short-id',
        'full-order-uuid',
      );
      expect(match).toBe(false);
    });
  });
});
