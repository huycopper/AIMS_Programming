// @vitest-environment jsdom

import '@angular/compiler';
import { of } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProductService } from './product.service';

describe('ProductService manager APIs', () => {
  let httpClient: any;
  let service: ProductService;
  const managerId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    httpClient = {
      get: vi.fn().mockReturnValue(of({ data: [], total: 0, page: 1, limit: 20 })),
      post: vi.fn().mockReturnValue(of({})),
      patch: vi.fn().mockReturnValue(of({})),
    };
    service = new ProductService(httpClient);
  });

  it('sends manager identity header for admin product listing', () => {
    service.getAdminProducts(managerId, { search: 'book', limit: 100 }).subscribe();

    expect(httpClient.get).toHaveBeenCalledWith(
      'http://localhost:8080/api/products/admin',
      expect.objectContaining({
        headers: { 'X-AIMS-User-Id': managerId },
      }),
    );
  });

  it('creates exactly one typed product payload', () => {
    const payload = {
      productType: 'BOOK' as const,
      title: 'Domain-Driven Design',
      category: 'Software',
      height: 1,
      width: 1,
      length: 1,
      weight: 1,
      barcode: 'BC-1',
      originalValue: 100,
      currentPrice: 100,
      stockQuantity: 5,
      book: {
        authors: ['Eric Evans'],
        coverType: 'HARDCOVER',
        publisher: 'Addison-Wesley',
        publicationDate: '2026-01-01',
        numberOfPages: null,
        language: null,
        genre: null,
      },
    };

    service.createProduct(managerId, payload).subscribe();

    expect(httpClient.post).toHaveBeenCalledWith(
      'http://localhost:8080/api/products',
      payload,
      { headers: { 'X-AIMS-User-Id': managerId } },
    );
  });

  it('calls bulk delete endpoint with selected product ids', () => {
    const payload = {
      productIds: ['22222222-2222-4222-8222-222222222222'],
      reason: 'Discontinued',
    };

    service.bulkDeleteProducts(managerId, payload).subscribe();

    expect(httpClient.post).toHaveBeenCalledWith(
      'http://localhost:8080/api/products/bulk-delete',
      payload,
      { headers: { 'X-AIMS-User-Id': managerId } },
    );
  });

  it('queries product history by action/date filters', () => {
    service
      .getProductHistories(managerId, 'product-1', {
        actionType: 'UPDATE',
        from: '2026-01-01',
        to: '2026-01-02',
      })
      .subscribe();

    expect(httpClient.get).toHaveBeenCalledWith(
      'http://localhost:8080/api/products/product-1/histories',
      expect.objectContaining({
        headers: { 'X-AIMS-User-Id': managerId },
      }),
    );
  });
});
