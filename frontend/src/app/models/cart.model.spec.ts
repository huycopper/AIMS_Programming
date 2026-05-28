import { describe, it, expect, beforeEach } from 'vitest';
import { Cart, CartItem } from './cart.model';
import { Product } from './product.model';

describe('Cart Model', () => {
  let mockProduct1: Product;
  let mockProduct2: Product;

  beforeEach(() => {
    mockProduct1 = {
      productId: 'p1',
      productType: 'BOOK',
      title: 'Test Book 1',
      category: 'Books',
      generalDescription: null,
      height: 10,
      width: 10,
      length: 10,
      weight: 0.5,
      barcode: '123',
      originalValue: 100,
      currentPrice: 90,
      stockQuantity: 10,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockProduct2 = {
      ...mockProduct1,
      productId: 'p2',
      title: 'Test Book 2',
      weight: 1.0,
      currentPrice: 150,
      stockQuantity: 5,
    };
  });

  describe('CartItem', () => {
    it('should calculate subtotal correctly', () => {
      const item = new CartItem(mockProduct1, 2);
      expect(item.getSubtotal()).toBe(180);
    });

    it('should calculate weight correctly', () => {
      const item = new CartItem(mockProduct1, 3);
      expect(item.getWeight()).toBe(1.5);
    });
  });

  describe('Cart', () => {
    let cart: Cart;

    beforeEach(() => {
      cart = new Cart();
    });

    it('should add items and calculate totals correctly', () => {
      cart.addItem(mockProduct1, 2);
      cart.addItem(mockProduct2, 1);
      
      expect(cart.items.length).toBe(2);
      expect(cart.calculateSubTotal()).toBe(330); // 90*2 + 150*1
      expect(cart.getTotalWeight()).toBe(2.0); // 0.5*2 + 1.0*1
    });

    it('should update quantity and cap at stock limit', () => {
      cart.addItem(mockProduct2, 2);
      cart.updateQuantity('p2', 10);
      
      const item = cart.getItem('p2');
      expect(item?.quantity).toBe(5); // Capped at stockQuantity 5
    });

    it('should remove items', () => {
      cart.addItem(mockProduct1, 1);
      cart.removeItem('p1');
      expect(cart.items.length).toBe(0);
    });

    it('should remove item if quantity updated to 0', () => {
      cart.addItem(mockProduct1, 1);
      cart.updateQuantity('p1', 0);
      expect(cart.items.length).toBe(0);
    });
    
    it('should empty cart', () => {
      cart.addItem(mockProduct1, 1);
      cart.emptyCart();
      expect(cart.items.length).toBe(0);
    });
  });
});
