// @vitest-environment jsdom
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CartScreen } from './cart-screen';
import { CartService } from '../../services/cart.service';
import { BehaviorSubject, of } from 'rxjs';
import { Cart } from '../../models/cart.model';

describe('CartScreen', () => {
  let component: CartScreen;
  let mockCartService: any;
  let mockProductService: any;
  let mockRouter: any;
  let cartSubject: BehaviorSubject<Cart>;

  beforeEach(() => {
    const initialCart = new Cart();
    cartSubject = new BehaviorSubject<Cart>(initialCart);

    mockCartService = {
      getCartObservable: () => cartSubject.asObservable(),
      updateQuantity: vi.fn((productId: string, quantity: number) => {
        const cart = cartSubject.getValue();
        cart.updateQuantity(productId, quantity);
        cartSubject.next(cart);
      }),
      removeItem: vi.fn((productId: string) => {
        const cart = cartSubject.getValue();
        cart.removeItem(productId);
        cartSubject.next(cart);
      }),
      updateProductSnapshot: vi.fn((product: any) => {
        const cart = cartSubject.getValue();
        cart.updateProductSnapshot(product);
        cartSubject.next(cart);
      }),
      getCart: () => cartSubject.getValue()
    };

    mockProductService = {
      getProductById: vi.fn().mockReturnValue(of({})),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    component = new CartScreen(
      mockCartService as any,
      mockRouter as any,
      { markForCheck: vi.fn() } as any,
      mockProductService as any,
    );
    component.ngOnInit();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate totals when cart is updated', () => {
    const mockProduct = {
      productId: 'p1',
      productType: 'BOOK',
      title: 'Test Book 1',
      category: 'Books',
      weight: 0.5,
      currentPrice: 90,
      stockQuantity: 10
    } as any;

    const cart = new Cart();
    cart.addItem(mockProduct, 2);
    cartSubject.next(cart);

    expect(component.totalExclVAT).toBe(180);
    expect(component.totalWeight).toBe(1.0);
  });

  it('should call updateQuantity on CartService when quantity changed', () => {
    component.updateQuantity('p1', 3);
    expect(mockCartService.updateQuantity).toHaveBeenCalledWith('p1', 3);
  });

  it('should call removeItem on CartService when remove button clicked', () => {
    component.removeItem('p1');
    expect(mockCartService.removeItem).toHaveBeenCalledWith('p1');
  });

  it('should set exact insufficient stock warning for lacking quantity', () => {
    const mockProduct = {
      productId: 'p1',
      title: 'Test Book',
      stockQuantity: 3
    } as any;

    const cart = new Cart();
    cart.addItem(mockProduct, 2);
    cartSubject.next(cart);

    // Try to update to a quantity greater than stock
    component.handleQuantityChange('p1', 5);

    expect(component.insufficientStockItems['p1']).toEqual({
      productId: 'p1',
      title: 'Test Book',
      requested: 5,
      available: 3,
      lacking: 2,
    });
    expect(mockCartService.updateQuantity).toHaveBeenCalledWith('p1', 5);
  });

  it('should navigate to /delivery when askToPlaceOrder is called without shortages', () => {
    component.askToPlaceOrder();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/delivery']);
  });

  it('should block delivery when unresolved shortages exist', () => {
    const cart = new Cart();
    cart.addItem({
      productId: 'p1',
      title: 'Test Book',
      stockQuantity: 3,
      currentPrice: 90,
      weight: 0.5,
    } as any, 5);
    cartSubject.next(cart);

    component.askToPlaceOrder();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(component.checkoutError).toContain('update the cart');
  });

  it('should refresh product snapshots from backend stock', () => {
    const staleProduct = {
      productId: 'p1',
      productType: 'BOOK',
      title: 'Test Book',
      category: 'Books',
      weight: 0.5,
      currentPrice: 90,
      stockQuantity: 10
    } as any;
    const freshProduct = { ...staleProduct, stockQuantity: 3, currentPrice: 95 };
    const cart = new Cart();
    cart.addItem(staleProduct, 5);
    cartSubject.next(cart);
    mockProductService.getProductById.mockReturnValue(of(freshProduct));

    component.ngOnDestroy();
    component = new CartScreen(
      mockCartService as any,
      mockRouter as any,
      { markForCheck: vi.fn() } as any,
      mockProductService as any,
    );
    component.ngOnInit();

    expect(mockProductService.getProductById).toHaveBeenCalledWith('p1');
    expect(component.insufficientStockItems['p1'].lacking).toBe(2);
    expect(component.totalExclVAT).toBe(475);
  });
});
