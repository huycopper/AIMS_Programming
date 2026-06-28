import { describe, expect, it, vi } from 'vitest';
import { Product } from '../../models/product.model';
import { ProductItemComponent } from './product-item';

describe('ProductItemComponent', () => {
  const product: Product = {
    productId: 'p1',
    productType: 'BOOK',
    title: 'Clean Code',
    category: 'Programming',
    generalDescription: null,
    height: 1,
    width: 1,
    length: 1,
    weight: 0.5,
    barcode: 'BC-1',
    originalValue: 100000,
    currentPrice: 120000,
    stockQuantity: 3,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    book: {
      productId: 'p1',
      authors: ['Robert C. Martin'],
      coverType: 'Paperback',
      publisher: 'Prentice Hall',
      publicationDate: '2008-08-01',
      numberOfPages: 464,
      language: 'English',
      genre: 'Software',
    },
  };

  const createComponent = () => {
    const cartService = {
      addItem: vi.fn(),
      getCart: vi.fn().mockReturnValue({ getItem: vi.fn().mockReturnValue(undefined) }),
    };
    const router = { navigate: vi.fn() };
    const component = new ProductItemComponent(cartService as any, router as any);
    component.product = product;
    return { component, cartService, router };
  };

  it('adds the requested quantity to cart from the card', () => {
    const { component, cartService } = createComponent();
    component.quantity = 3;

    component.addToCart({ stopPropagation: vi.fn() } as any);

    expect(cartService.addItem).toHaveBeenCalledWith(product, 3);
  });

  it('rejects over-stock requests instead of adding them', () => {
    const { component, cartService } = createComponent();
    component.quantity = 5;

    component.addToCart({ stopPropagation: vi.fn() } as any);

    expect(cartService.addItem).not.toHaveBeenCalled();
    expect(component.addToCartMessage).toContain('Only 3 units are in stock');
  });

  it('rejects requests that would exceed stock after existing cart quantity', () => {
    const { component, cartService } = createComponent();
    cartService.getCart.mockReturnValue({
      getItem: vi.fn().mockReturnValue({ quantity: 2 }),
    });
    component.quantity = 2;

    component.addToCart({ stopPropagation: vi.fn() } as any);

    expect(cartService.addItem).not.toHaveBeenCalled();
    expect(component.addToCartMessage).toContain('add at most 1 more');
  });

  it('rejects invalid and out-of-stock requests with inline warnings', () => {
    const { component, cartService } = createComponent();
    component.quantity = 0;

    component.addToCart({ stopPropagation: vi.fn() } as any);
    expect(cartService.addItem).not.toHaveBeenCalled();
    expect(component.addToCartMessage).toContain('at least 1');

    component.product = { ...product, stockQuantity: 0 };
    component.quantity = 1;
    component.addToCart({ stopPropagation: vi.fn() } as any);
    expect(component.addToCartMessage).toContain('out of stock');
  });

  it('navigates to product detail when selected', () => {
    const { component, router } = createComponent();

    component.openProductDetail();

    expect(router.navigate).toHaveBeenCalledWith(['/products', 'p1']);
  });
});
