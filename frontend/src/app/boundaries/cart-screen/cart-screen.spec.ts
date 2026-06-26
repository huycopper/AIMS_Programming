// @vitest-environment jsdom
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CartScreen } from './cart-screen';
import { CartService } from '../../services/cart.service';
import { BehaviorSubject } from 'rxjs';
import { Cart } from '../../models/cart.model';

describe('CartScreen', () => {
  let component: CartScreen;
  let mockCartService: any;
  let mockRouter: any;
  let cartSubject: BehaviorSubject<Cart>;

  beforeEach(() => {
    const initialCart = new Cart();
    cartSubject = new BehaviorSubject<Cart>(initialCart);

    mockCartService = {
      getCartObservable: () => cartSubject.asObservable(),
      updateQuantity: vi.fn(),
      removeItem: vi.fn(),
      getCart: () => cartSubject.getValue()
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    component = new CartScreen(mockCartService as any, mockRouter as any, { markForCheck: vi.fn() } as any);
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

  it('should set insufficientStockItem banner for insufficient stock', () => {
    const mockProduct = {
      productId: 'p1',
      title: 'Test Book',
      stockQuantity: 3
    } as any;

    const cart = new Cart();
    cart.addItem(mockProduct, 2);
    cartSubject.next(cart);

    // Try to update to a quantity greater than stock
    component.handleQuantityChange('p1', 5, 3);

    expect(component.insufficientStockItem['p1']).toBe(3);
    expect(mockCartService.updateQuantity).toHaveBeenCalledWith('p1', 3); // Updates to max available
  });

  it('should navigate to /delivery when askToPlaceOrder is called', () => {
    component.askToPlaceOrder();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/delivery']);
  });
});
