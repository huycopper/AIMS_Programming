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
  minPrice: number | null = null;
  maxPrice: number | null = null;

  /** Category checkboxes as per Screen Spec */
  categories = [
    { label: 'Books', value: 'BOOK', checked: false },
    { label: 'CDs', value: 'CD', checked: false },
    { label: 'DVDs', value: 'DVD', checked: false },
    { label: 'Newspapers', value: 'NEWSPAPER', checked: false },
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
  onCategoryToggle(): void {
    this.emitSearch();
  }

  /**
   * Apply price range filter.
   * Screen Spec: "Apply price range filter to product grid"
   */
  onApplyPriceFilter(): void {
    this.emitSearch();
  }

  /**
   * Clear all filters and reset to defaults.
   */
  onClearFilters(): void {
    this.searchQuery = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.categories.forEach((c) => (c.checked = false));
    this.emitSearch();
  }

  private emitSearch(): void {
    const selectedCategories = this.categories
      .filter((c) => c.checked)
      .map((c) => c.value);

    const params: SearchProductsParams = {};

    if (this.searchQuery.trim()) {
      params.search = this.searchQuery.trim();
    }
    if (selectedCategories.length > 0) {
      params.category = selectedCategories.join(',');
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
