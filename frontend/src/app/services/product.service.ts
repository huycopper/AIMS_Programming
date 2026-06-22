import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  BulkDeleteProductsRequest,
  BulkDeleteProductsResponse,
  CreateProductRequest,
  Product,
  PaginatedProducts,
  ProductHistory,
  ProductHistoryQuery,
  SearchProductsParams,
  UpdateProductRequest,
} from '../models/product.model';

/**
 * ProductService — Angular service acting as the client-side Control (BCE pattern).
 * Calls backend REST API endpoints for product browsing and search/filter.
 */
@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly apiUrl = 'http://localhost:8080/api/products';

  constructor(private readonly http: HttpClient) { }

  /**
   * AC-1: Fetch 20 random ACTIVE products for the homepage.
   * Calls GET /api/products/random
   */
  getRandomProducts(category?: string): Observable<Product[]> {
    let httpParams = new HttpParams();
    if (category) {
      httpParams = httpParams.set('category', category);
    }
    return this.http.get<Product[]>(`${this.apiUrl}/random`, { params: httpParams });
  }

  /**
   * AC-2: Search and filter products by title, category, price range.
   * Calls GET /api/products with query params.
   */
  searchProducts(params: SearchProductsParams): Observable<PaginatedProducts> {
    let httpParams = new HttpParams();

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.category) {
      httpParams = httpParams.set('category', params.category);
    }
    if (params.minPrice !== undefined && params.minPrice !== null) {
      httpParams = httpParams.set('minPrice', params.minPrice.toString());
    }
    if (params.maxPrice !== undefined && params.maxPrice !== null) {
      httpParams = httpParams.set('maxPrice', params.maxPrice.toString());
    }
    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<PaginatedProducts>(this.apiUrl, {
      params: httpParams,
    });
  }

  getAdminProducts(
    managerUserId: string,
    params: SearchProductsParams = {},
  ): Observable<PaginatedProducts> {
    return this.http.get<PaginatedProducts>(`${this.apiUrl}/admin`, {
      params: this.toProductParams(params),
      headers: this.managerHeaders(managerUserId),
    });
  }

  createProduct(
    managerUserId: string,
    payload: CreateProductRequest,
  ): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, payload, {
      headers: this.managerHeaders(managerUserId),
    });
  }

  updateProduct(
    managerUserId: string,
    productId: string,
    payload: UpdateProductRequest,
  ): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/${productId}`, payload, {
      headers: this.managerHeaders(managerUserId),
    });
  }

  bulkDeleteProducts(
    managerUserId: string,
    payload: BulkDeleteProductsRequest,
  ): Observable<BulkDeleteProductsResponse> {
    return this.http.post<BulkDeleteProductsResponse>(
      `${this.apiUrl}/bulk-delete`,
      payload,
      { headers: this.managerHeaders(managerUserId) },
    );
  }

  getProductHistories(
    managerUserId: string,
    productId: string,
    query: ProductHistoryQuery = {},
  ): Observable<ProductHistory[]> {
    let httpParams = new HttpParams();
    if (query.actionType) {
      httpParams = httpParams.set('actionType', query.actionType);
    }
    if (query.from) {
      httpParams = httpParams.set('from', query.from);
    }
    if (query.to) {
      httpParams = httpParams.set('to', query.to);
    }

    return this.http.get<ProductHistory[]>(
      `${this.apiUrl}/${productId}/histories`,
      {
        params: httpParams,
        headers: this.managerHeaders(managerUserId),
      },
    );
  }

  private managerHeaders(managerUserId: string): { [header: string]: string } {
    return { 'X-AIMS-User-Id': managerUserId };
  }

  private toProductParams(params: SearchProductsParams): HttpParams {
    let httpParams = new HttpParams();

    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.category) {
      httpParams = httpParams.set('category', params.category);
    }
    if (params.minPrice !== undefined && params.minPrice !== null) {
      httpParams = httpParams.set('minPrice', params.minPrice.toString());
    }
    if (params.maxPrice !== undefined && params.maxPrice !== null) {
      httpParams = httpParams.set('maxPrice', params.maxPrice.toString());
    }
    if (params.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return httpParams;
  }
}
