// @vitest-environment jsdom

import '@angular/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BehaviorSubject, of } from 'rxjs';
import { Cart } from '../../models/cart.model';
import { Product } from '../../models/product.model';
import { ProductListComponent } from './product-list';

describe('ProductListComponent', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollTo', {
      value: vi.fn(),
      writable: true,
    });
  });

  const randomProducts = Array.from({ length: 20 }, (_, index) => ({
    productId: `product-${index}`,
    productType: 'BOOK',
    title: `Book ${index}`,
    category: 'Books',
    generalDescription: null,
    height: 1,
    width: 1,
    length: 1,
    weight: 1,
    barcode: `barcode-${index}`,
    originalValue: 100000,
    currentPrice: 100000,
    stockQuantity: 5,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  })) as Product[];

  const createComponent = () => {
    const productService = {
      getRandomProducts: vi.fn().mockReturnValue(of(randomProducts)),
      searchProducts: vi.fn().mockReturnValue(
        of({
          data: [],
          total: 40,
          page: 1,
          limit: 20,
        }),
      ),
    };
    const cartService = {
      getCartObservable: () => new BehaviorSubject(new Cart()).asObservable(),
    };
    const component = new ProductListComponent(
      productService as any,
      cartService as any,
      { markForCheck: vi.fn() } as any,
    );

    return { component, productService };
  };

  it('loads 20 random products on startup', () => {
    const { component, productService } = createComponent();

    component.ngOnInit();

    expect(productService.getRandomProducts).toHaveBeenCalledWith();
    expect(productService.searchProducts).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
    expect(component.products).toEqual(randomProducts);
    expect(component.totalProducts).toBe(40);
    expect(component.totalPages).toBe(2);
    expect(component.isSearchMode).toBe(false);
  });

  it('uses paginated search for actual category-only filtering', () => {
    const { component, productService } = createComponent();

    component.onSearchChanged({ category: 'Programming', page: 1, limit: 20 });

    expect(productService.getRandomProducts).not.toHaveBeenCalled();
    expect(productService.searchProducts).toHaveBeenCalledWith({
      category: 'Programming',
      page: 1,
      limit: 20,
    });
  });

  it('returns to random homepage when all filters are cleared', () => {
    const { component, productService } = createComponent();

    component.onSearchChanged({ page: 1, limit: 20 });

    expect(productService.getRandomProducts).toHaveBeenCalledWith();
    expect(productService.searchProducts).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
  });

  it('preserves filters across pagination', () => {
    const { component, productService } = createComponent();
    component.onSearchChanged({
      search: 'code',
      category: 'Programming',
      minPrice: 100000,
      maxPrice: 200000,
      page: 1,
      limit: 20,
    });

    component.totalPages = 2;
    component.currentPage = 1;
    component.goToPage(2);

    expect(productService.searchProducts).toHaveBeenLastCalledWith({
      search: 'code',
      category: 'Programming',
      minPrice: 100000,
      maxPrice: 200000,
      page: 2,
      limit: 20,
    });
  });

  it('builds a compact pagination bar with ellipses for long result sets', () => {
    const { component } = createComponent();

    component.totalPages = 10;
    component.currentPage = 5;

    expect(component.getPaginationItems()).toEqual([
      1,
      'ellipsis-left',
      4,
      5,
      6,
      'ellipsis-right',
      10,
    ]);
  });

  it('keeps the leading pages visible near the start of long result sets', () => {
    const { component } = createComponent();

    component.totalPages = 10;
    component.currentPage = 2;

    expect(component.getPaginationItems()).toEqual([
      1,
      2,
      3,
      4,
      5,
      'ellipsis-right',
      10,
    ]);
  });

  it('reports the visible product range for the current search page', () => {
    const { component } = createComponent();

    component.totalProducts = 45;
    component.pageSize = 20;
    component.currentPage = 3;

    expect(component.firstVisibleProductIndex).toBe(41);
    expect(component.lastVisibleProductIndex).toBe(45);
  });

  it('loads catalog pages from the homepage pagination bar', () => {
    const { component, productService } = createComponent();

    component.totalPages = 2;
    component.currentPage = 1;
    component.isSearchMode = false;
    component.isLoading = false;
    component.goToPage(2);

    expect(productService.searchProducts).toHaveBeenCalledWith({
      page: 2,
      limit: 20,
    });
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    });
  });
});
