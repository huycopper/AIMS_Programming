import '@angular/compiler';
import { describe, expect, it, vi } from 'vitest';
import { BehaviorSubject, of } from 'rxjs';
import { Cart } from '../../models/cart.model';
import { ProductListComponent } from './product-list';

describe('ProductListComponent', () => {
  const createComponent = () => {
    const productService = {
      getRandomProducts: vi.fn().mockReturnValue(of([])),
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
    expect(productService.searchProducts).not.toHaveBeenCalled();
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
});
