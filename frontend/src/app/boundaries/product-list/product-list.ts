import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ProductItemComponent } from '../product-item/product-item';
import { SearchBarComponent } from '../search-bar/search-bar';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { forkJoin, Subscription } from 'rxjs';
import {
  Product,
  SearchProductsParams,
  PaginatedProducts,
} from '../../models/product.model';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

type PaginationItem = number | 'ellipsis-left' | 'ellipsis-right';

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
  private readonly maxVisiblePageButtons = 5;

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
   * AC-1: Load 20 random products for the homepage.
   */
  loadRandomProducts(): void {
    this.isLoading = true;
    this.isSearchMode = false;
    this.errorMessage = '';
    this.currentSearchParams = {};
    this.currentPage = 1;

    forkJoin({
      products: this.productService.getRandomProducts(),
      page: this.productService.searchProducts({ page: 1, limit: this.pageSize }),
    }).subscribe({
      next: ({ products, page }) => {
        const nextLimit = page.limit > 0 ? page.limit : 20;

        this.products = products;
        this.totalProducts = Math.max(page.total, products.length);
        this.pageSize = nextLimit;
        this.totalPages =
          this.totalProducts > 0
            ? Math.ceil(this.totalProducts / nextLimit)
            : 0;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load random products:', err);
        this.errorMessage = 'Failed to load products. Please try again.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Shared product loading logic used by both homepage browsing and search.
   */
  private loadProducts(params: SearchProductsParams): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.productService.searchProducts(params).subscribe({
      next: (result: PaginatedProducts) => {
        const nextLimit = result.limit > 0 ? result.limit : this.pageSize;

        this.products = result.data;
        this.totalProducts = result.total;
        this.currentPage = result.page;
        this.pageSize = nextLimit;
        this.totalPages =
          result.total > 0 ? Math.ceil(result.total / nextLimit) : 0;
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
    this.currentSearchParams = {
      ...params,
      page: 1,
      limit: params.limit ?? this.pageSize,
    };
    this.currentPage = 1;

    this.loadProducts(this.currentSearchParams);
  }

  /**
   * Navigate to a specific page.
   * Screen Spec: "Pagination buttons - Navigate to the selected page of results"
   */
  goToPage(page: number): void {
    if (
      this.isLoading ||
      page < 1 ||
      page > this.totalPages ||
      page === this.currentPage
    ) {
      return;
    }

    this.currentPage = page;
    if (this.isSearchMode) {
      this.currentSearchParams = {
        ...this.currentSearchParams,
        page,
        limit: this.currentSearchParams.limit ?? this.pageSize,
      };
      this.loadProducts(this.currentSearchParams);
    } else if (page === 1) {
      this.loadRandomProducts();
    } else {
      this.loadProducts({ page, limit: this.pageSize });
    }

    // Scroll to top of page when navigating to a new page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Get visible page numbers and ellipses for the pagination bar.
   */
  getPaginationItems(): PaginationItem[] {
    if (this.totalPages <= 0) {
      return [];
    }

    if (this.totalPages <= this.maxVisiblePageButtons + 2) {
      return this.createPageRange(1, this.totalPages);
    }

    let start = Math.max(2, this.currentPage - 1);
    let end = Math.min(this.totalPages - 1, this.currentPage + 1);

    if (this.currentPage <= 4) {
      start = 2;
      end = this.maxVisiblePageButtons;
    } else if (this.currentPage >= this.totalPages - 3) {
      start = this.totalPages - this.maxVisiblePageButtons + 1;
      end = this.totalPages - 1;
    }

    const pages: PaginationItem[] = [1];
    if (start > 2) {
      pages.push('ellipsis-left');
    }
    pages.push(...this.createPageRange(start, end));
    if (end < this.totalPages - 1) {
      pages.push('ellipsis-right');
    }
    pages.push(this.totalPages);
    return pages;
  }

  isPageNumber(item: PaginationItem): item is number {
    return typeof item === 'number';
  }

  get firstVisibleProductIndex(): number {
    if (this.totalProducts === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get lastVisibleProductIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalProducts);
  }

  private createPageRange(start: number, end: number): number[] {
    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }
}
