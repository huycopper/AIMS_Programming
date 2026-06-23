// @vitest-environment jsdom

import '@angular/compiler';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductManagementScreen } from '../boundaries/product-management-screen/product-management-screen';
import { ProductService } from './product.service';
import {
  BulkDeleteProductsRequest,
  CreateProductRequest,
  PaginatedProducts,
  Product,
  SearchProductsParams,
} from '../models/product.model';

type AuthenticatedProductService = {
  getAdminProducts(params?: SearchProductsParams): import('rxjs').Observable<PaginatedProducts>;
  createProduct(payload: CreateProductRequest): import('rxjs').Observable<Product>;
  bulkDeleteProducts(payload: BulkDeleteProductsRequest): import('rxjs').Observable<unknown>;
};

describe('Story 5.3 product authentication boundary (ATDD)', () => {
  let http: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
  };
  let facade: AuthenticatedProductService;

  beforeEach(() => {
    localStorage.clear();
    http = {
      get: vi.fn().mockReturnValue(of({ data: [], total: 0, page: 1, limit: 20 })),
      post: vi.fn().mockReturnValue(of({})),
      patch: vi.fn().mockReturnValue(of({})),
    };
    facade = new ProductService(http as never) as unknown as AuthenticatedProductService;
  });

  it('[P1] admin product methods no longer accept or send legacy manager identity', () => {
    facade.getAdminProducts({ search: 'book' }).subscribe();
    facade
      .bulkDeleteProducts({
        productIds: ['22222222-2222-4222-8222-222222222222'],
        reason: 'Discontinued',
      })
      .subscribe();

    const serializedCalls = JSON.stringify([...http.get.mock.calls, ...http.post.mock.calls]);
    expect(serializedCalls).not.toContain('X-AIMS-User-Id');
    expect(serializedCalls).not.toContain('aims_product_manager_user_id');
    expect(http.get).toHaveBeenCalledWith(
      'http://localhost:8080/api/products/admin',
      expect.objectContaining({ params: expect.anything() }),
    );
  });

  it('[P1] product management has no manager-ID state or local-storage dependency', () => {
    localStorage.setItem('aims_product_manager_user_id', 'attacker-controlled-id');
    const productService = {
      getAdminProducts: vi.fn().mockReturnValue(of({ data: [], total: 0, page: 1, limit: 100 })),
    };
    const screen = new ProductManagementScreen(
      productService as never,
      { markForCheck: vi.fn() } as never,
    );

    expect('managerUserId' in screen).toBe(false);
    screen.loadProducts();
    expect(productService.getAdminProducts).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 }),
    );
    expect(localStorage.getItem('aims_product_manager_user_id')).toBe('attacker-controlled-id');
  });
});
