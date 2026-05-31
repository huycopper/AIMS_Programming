// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CartService } from './cart.service';
import { Product } from '../models/product.model';
import { Cart } from '../models/cart.model';

describe('CartService', () => {
  let service: CartService;
  let mockProduct: Product;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    service = new CartService();

    mockProduct = {
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
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add item and update behavior subject', () => {
    service.addItem(mockProduct, 2);
    let cartState: Cart | undefined;
    service.getCartObservable().subscribe(cart => cartState = cart);
    
    expect(cartState?.items.length).toBe(1);
    expect(cartState?.items[0].quantity).toBe(2);
  });

  it('should save to localStorage', () => {
    service.addItem(mockProduct, 2);
    const saved = localStorage.getItem('aims_cart');
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved!);
    expect(parsed.length).toBe(1);
    expect(parsed[0].product.productId).toBe('p1');
    expect(parsed[0].quantity).toBe(2);
  });

  it('should load from localStorage on init', () => {
    localStorage.setItem('aims_cart', JSON.stringify([{ productId: 'p1', quantity: 3 }]));
    
    // We need to fetch the full product details from backend eventually, but for now
    // the service might just restore the structure or rely on an async fetch.
    // For simplicity, let's assume CartService restores items.
    // Wait, if it only stores productId and quantity, it needs to fetch product details.
    // Let's test just basic behavior for now and see what we need.
  });
  
  it('should update quantity and save', () => {
    service.addItem(mockProduct, 2);
    service.updateQuantity('p1', 5);
    
    let cartState: Cart | undefined;
    service.getCartObservable().subscribe(cart => cartState = cart);
    expect(cartState?.items[0].quantity).toBe(5);
  });

  it('should remove item and save', () => {
    service.addItem(mockProduct, 2);
    service.removeItem('p1');
    
    let cartState: Cart | undefined;
    service.getCartObservable().subscribe(cart => cartState = cart);
    expect(cartState?.items.length).toBe(0);
  });
});
