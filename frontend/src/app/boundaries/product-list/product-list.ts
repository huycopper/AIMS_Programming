import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ProductItemComponent } from '../product-item/product-item';
import { SearchBarComponent } from '../search-bar/search-bar';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { Subscription } from 'rxjs';
import {
  Product,
  SearchProductsParams,
  PaginatedProducts,
} from '../../models/product.model';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * ProductListComponent — Boundary class (BCE pattern).
 * Main homepage screen that displays the product grid, search/filter sidebar,
 * and pagination controls.
 * Maps to the Homepage screen specification.
 */
@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ProductItemComponent, SearchBarComponent],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductListComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  isLoading = true;
  isSearchMode = false;
  errorMessage = '';
  cartItemCount = 0;
  private cartSub?: Subscription;

  // Pagination state
  currentPage = 1;
  totalProducts = 0;
  pageSize = 20;
  totalPages = 0;

  // Current search params (for pagination navigation)
  private currentSearchParams: SearchProductsParams = {};

  constructor(
    private readonly productService: ProductService,
    private readonly cartService: CartService,
    private readonly cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadRandomProducts();
    this.cartSub = this.cartService.getCartObservable().subscribe(cart => {
      this.cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    if (this.cartSub) {
      this.cartSub.unsubscribe();
    }
  }

  /**
   * AC-1: Load products for the homepage with pagination.
   * Loads all active products sorted by newest first, 20 per page.
   */
  loadRandomProducts(): void {
    this.isLoading = true;
    this.isSearchMode = false;
    this.errorMessage = '';
    this.currentSearchParams = {};

    this.loadProducts({ page: this.currentPage, limit: this.pageSize });
  }

  /**
   * Shared product loading logic used by both homepage browsing and search.
   */
  private loadProducts(params: SearchProductsParams): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.productService.searchProducts(params).subscribe({
      next: (result: PaginatedProducts) => {
        this.products = result.data;
        this.totalProducts = result.total;
        this.currentPage = result.page;
        this.pageSize = result.limit;
        this.totalPages = Math.ceil(result.total / result.limit);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load products:', err);
        this.errorMessage = 'Failed to load products. Please try again.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * AC-2: Handle search/filter from SearchBar boundary.
   * "When they enter a search query or filter by price range,
   *  the system displays all matching products"
   */
  onSearchChanged(params: SearchProductsParams): void {
    // If no filters applied, go back to browse mode
    const hasFilters =
      params.search ||
      params.category ||
      params.minPrice !== undefined ||
      params.maxPrice !== undefined;

    if (!hasFilters) {
      this.currentPage = 1;
      this.loadRandomProducts();
      return;
    }

    this.isSearchMode = true;
    this.currentSearchParams = { ...params };
    this.currentSearchParams.page = 1;
    this.currentPage = 1;

    this.loadProducts(this.currentSearchParams);
  }

  /**
   * Navigate to a specific page.
   * Screen Spec: "Pagination buttons - Navigate to the selected page of results"
   */
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;

    if (this.isSearchMode) {
      this.currentSearchParams.page = page;
      this.loadProducts(this.currentSearchParams);
    } else {
      this.loadProducts({ page, limit: this.pageSize });
    }

    // Scroll to top of page when navigating to a new page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Get visible page numbers for pagination.
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }
}
