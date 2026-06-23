// @vitest-environment jsdom

import '@angular/compiler';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductManagementScreen } from './product-management-screen';
import { Product } from '../../models/product.model';

describe('ProductManagementScreen', () => {
  let component: ProductManagementScreen;
  let productService: any;
  let cdr: any;
  const managerId = '11111111-1111-4111-8111-111111111111';

  const product: Product = {
    productId: '22222222-2222-4222-8222-222222222222',
    productType: 'BOOK',
    title: 'Test Book',
    category: 'Books',
    generalDescription: null,
    height: 1,
    width: 1,
    length: 1,
    weight: 1,
    barcode: 'BC-1',
    originalValue: 100,
    currentPrice: 100,
    stockQuantity: 10,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    book: {
      productId: '22222222-2222-4222-8222-222222222222',
      authors: ['Author'],
      coverType: 'PAPERBACK',
      publisher: 'Publisher',
      publicationDate: '2026-01-01',
      numberOfPages: null,
      language: null,
      genre: null,
    },
  };

  beforeEach(() => {
    localStorage.clear();
    productService = {
      getAdminProducts: vi.fn().mockReturnValue(
        of({
          data: [product],
          total: 1,
          page: 1,
          limit: 100,
        }),
      ),
      createProduct: vi.fn().mockReturnValue(of(product)),
      updateProduct: vi.fn().mockReturnValue(of(product)),
      bulkDeleteProducts: vi.fn().mockReturnValue(of({ results: [] })),
      getProductHistories: vi.fn().mockReturnValue(of([])),
    };
    cdr = {
      markForCheck: vi.fn(),
    };
    component = new ProductManagementScreen(productService, cdr);
  });

  it('rejects currentPrice below 30% of original value before calling API', () => {
    component.draft.title = 'Invalid Price';
    component.draft.category = 'Books';
    component.draft.barcode = 'BC-2';
    component.draft.originalValue = 100;
    component.draft.currentPrice = 29;
    component.draft.stockQuantity = 1;
    component.draft.authorsText = 'Author';
    component.draft.bookPublisher = 'Publisher';
    component.draft.bookPublicationDate = '2026-01-01';

    component.submitProduct();

    expect(component.errorMessage).toContain('at least 30%');
    expect(productService.createProduct).not.toHaveBeenCalled();
  });

  it('requires stock adjustment reason when stock changes in update mode', () => {
    component.selectProduct(product);
    component.draft.stockQuantity = 9;
    component.draft.stockAdjustmentReason = '';

    component.submitProduct();

    expect(component.errorMessage).toContain('Stock adjustment reason');
    expect(productService.updateProduct).not.toHaveBeenCalled();
  });

  it('limits delete selection to 10 products on the client boundary', () => {
    for (let index = 0; index < 10; index++) {
      component.toggleDeleteSelection(`product-${index}`, true);
    }

    component.toggleDeleteSelection('product-10', true);

    expect(component.selectedProductIds.size).toBe(10);
    expect(component.errorMessage).toContain('at most 10');
  });

  it('submits selected products to bulk delete API', () => {
    component.toggleDeleteSelection(product.productId, true);
    component.deleteReason = 'Discontinued';

    component.submitBulkDelete();

    expect(productService.bulkDeleteProducts).toHaveBeenCalledWith({
      productIds: [product.productId],
      reason: 'Discontinued',
    });
  });
});
