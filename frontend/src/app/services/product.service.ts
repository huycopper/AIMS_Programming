import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Product,
  PaginatedProducts,
  SearchProductsParams,
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
  getRandomProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/random`);
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
}
