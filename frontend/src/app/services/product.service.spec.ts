// @vitest-environment jsdom

import '@angular/compiler';
import { of } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProductService } from './product.service';

describe('ProductService manager APIs', () => {
  let httpClient: any;
  let service: ProductService;

  beforeEach(() => {
    httpClient = {
      get: vi.fn().mockReturnValue(of({ data: [], total: 0, page: 1, limit: 20 })),
      post: vi.fn().mockReturnValue(of({})),
      patch: vi.fn().mockReturnValue(of({})),
    };
    service = new ProductService(httpClient);
  });

  it('calls admin product listing with correct params', () => {
    service.getAdminProducts({ search: 'book', limit: 100 }).subscribe();

    expect(httpClient.get).toHaveBeenCalledWith(
      'http://localhost:8080/api/products/admin',
      expect.objectContaining({
        params: expect.anything(),
      }),
    );
  });

  it('calls public search endpoint with catalog filters', () => {
    service
      .searchProducts({
        search: 'clean code',
        category: 'Programming',
        minPrice: 100000,
        maxPrice: 200000,
        page: 2,
        limit: 20,
      })
      .subscribe();

    const call = httpClient.get.mock.calls[0];
    expect(call[0]).toBe('http://localhost:8080/api/products');
    expect(call[1].params.get('search')).toBe('clean code');
    expect(call[1].params.get('category')).toBe('Programming');
    expect(call[1].params.get('minPrice')).toBe('100000');
    expect(call[1].params.get('maxPrice')).toBe('200000');
    expect(call[1].params.get('page')).toBe('2');
  });

  it('calls public random products endpoint', () => {
    service.getRandomProducts().subscribe();

    expect(httpClient.get).toHaveBeenCalledWith(
      'http://localhost:8080/api/products/random',
      expect.objectContaining({
        params: expect.anything(),
      }),
    );
  });

  it('calls public product detail endpoint', () => {
    service.getProductById('product-1').subscribe();

    expect(httpClient.get).toHaveBeenCalledWith(
      'http://localhost:8080/api/products/product-1'
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

    service.createProduct(payload).subscribe();

    expect(httpClient.post).toHaveBeenCalledWith(
      'http://localhost:8080/api/products',
      payload
    );
  });

  it('calls bulk delete endpoint with selected product ids', () => {
    const payload = {
      productIds: ['22222222-2222-4222-8222-222222222222'],
      reason: 'Discontinued',
    };

    service.bulkDeleteProducts(payload).subscribe();

    expect(httpClient.post).toHaveBeenCalledWith(
      'http://localhost:8080/api/products/bulk-delete',
      payload
    );
  });

  it('queries product history by action/date filters', () => {
    service
      .getProductHistories('product-1', {
        actionType: 'UPDATE',
        from: '2026-01-01',
        to: '2026-01-02',
      })
      .subscribe();

    expect(httpClient.get).toHaveBeenCalledWith(
      'http://localhost:8080/api/products/product-1/histories',
      expect.objectContaining({
        params: expect.anything(),
      }),
    );
  });
});
