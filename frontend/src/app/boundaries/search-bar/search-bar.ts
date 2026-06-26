import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SearchProductsParams } from '../../models/product.model';

/**
 * SearchBarComponent — Boundary class (BCE pattern).
 * Provides search input and filter controls (category checkboxes, price range).
 * Maps to the Homepage screen specification controls.
 */
@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.css',
})
export class SearchBarComponent {
  @Output() searchChanged = new EventEmitter<SearchProductsParams>();

  searchQuery = '';
  categoryQuery = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  selectedPriceBucket = '';

  readonly priceBuckets = [
    { label: 'Under 100,000 VND', value: 'under-100000', minPrice: null, maxPrice: 99999 },
    { label: '100,000-200,000 VND', value: '100000-200000', minPrice: 100000, maxPrice: 200000 },
    { label: '200,000-300,000 VND', value: '200000-300000', minPrice: 200000, maxPrice: 300000 },
    { label: '300,000-400,000 VND', value: '300000-400000', minPrice: 300000, maxPrice: 400000 },
    { label: '400,000 VND and above', value: '400000-up', minPrice: 400000, maxPrice: null },
  ];

  /**
   * Submit search query — triggered by clicking the Search button
   * or pressing Enter in the search input.
   * Screen Spec: "Submit search query and reload product grid"
   */
  onSearch(): void {
    this.emitSearch();
  }

  /**
   * Toggle a category filter and re-emit search.
   * Screen Spec: "Filter product list by selected categories"
   */
  onCategoryChange(): void {
    this.emitSearch();
  }

  onPriceBucketChange(): void {
    const bucket = this.priceBuckets.find((item) => item.value === this.selectedPriceBucket);
    this.minPrice = bucket?.minPrice ?? null;
    this.maxPrice = bucket?.maxPrice ?? null;
    this.emitSearch();
  }

  /**
   * Apply price range filter.
   * Screen Spec: "Apply price range filter to product grid"
   */
  onApplyPriceFilter(): void {
    this.selectedPriceBucket = '';
    this.emitSearch();
  }

  /**
   * Clear all filters and reset to defaults.
   */
  onClearFilters(): void {
    this.searchQuery = '';
    this.categoryQuery = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.selectedPriceBucket = '';
    this.emitSearch();
  }

  private emitSearch(): void {
    const params: SearchProductsParams = {};

    if (this.searchQuery.trim()) {
      params.search = this.searchQuery.trim();
    }
    if (this.categoryQuery.trim()) {
      params.category = this.categoryQuery.trim();
    }
    if (this.minPrice !== null && this.minPrice >= 0) {
      params.minPrice = this.minPrice;
    }
    if (this.maxPrice !== null && this.maxPrice >= 0) {
      params.maxPrice = this.maxPrice;
    }
    params.page = 1;
    params.limit = 20;

    this.searchChanged.emit(params);
  }
}
