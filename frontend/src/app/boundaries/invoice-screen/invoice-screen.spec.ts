// @vitest-environment jsdom
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvoiceScreen } from './invoice-screen';
import { CartService } from '../../services/cart.service';
import { BehaviorSubject } from 'rxjs';
import { Cart } from '../../models/cart.model';

describe('InvoiceScreen', () => {
  let component: InvoiceScreen;
  let mockRouter: any;
  let mockCartService: any;

  const mockInvoiceData = {
    deliveryInfo: {
      name: 'Test User',
      phone: '0912345678',
      province: 'Hà Nội',
      address: '123 Street',
    },
    cartItems: [
      { productId: '1', quantity: 2, weight: 0.5, currentPrice: 60000 },
    ],
    totalWeight: 1.0,
    isInnerCity: true,
    baseFee: 22000,
    additionalFee: 0,
    grossShipping: 22000,
    discount: 22000,
    shippingFee: 0,
    subtotal: 120000,
    vat: 12000,
    totalAmount: 132000,
  };

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn(),
      getCurrentNavigation: vi.fn().mockReturnValue(null),
    };

    mockCartService = {
      emptyCart: vi.fn(),
    };

    // Set up history.state with invoice data
    Object.defineProperty(window, 'history', {
      value: {
        ...window.history,
        state: { invoiceData: mockInvoiceData, cart: null },
      },
      writable: true,
    });

    component = new InvoiceScreen(
      mockRouter as any,
      mockCartService as CartService,
    );
    component.ngOnInit();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load invoice data from history state', () => {
    expect(component.invoiceData).toBeTruthy();
    expect(component.invoiceData?.subtotal).toBe(120000);
    expect(component.invoiceData?.vat).toBe(12000);
    expect(component.invoiceData?.shippingFee).toBe(0);
    expect(component.invoiceData?.totalAmount).toBe(132000);
  });

  it('should display delivery info correctly', () => {
    expect(component.invoiceData?.deliveryInfo.name).toBe('Test User');
    expect(component.invoiceData?.deliveryInfo.province).toBe('Hà Nội');
    expect(component.invoiceData?.deliveryInfo.phone).toBe('0912345678');
  });

  it('should navigate back to delivery on goBackToDelivery()', () => {
    component.goBackToDelivery();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/delivery']);
  });

  it('should clear cart and navigate home on confirmOrder()', () => {
    component.confirmOrder();
    expect(mockCartService.emptyCart).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should redirect to cart if no invoice data', () => {
    Object.defineProperty(window, 'history', {
      value: { ...window.history, state: {} },
      writable: true,
    });

    const noDataComponent = new InvoiceScreen(
      mockRouter as any,
      mockCartService as CartService,
    );
    noDataComponent.ngOnInit();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/cart']);
  });
});
