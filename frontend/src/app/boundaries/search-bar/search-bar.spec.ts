import { describe, expect, it, vi } from 'vitest';
import { SearchBarComponent } from './search-bar';

describe('SearchBarComponent', () => {
  it('emits title, actual category, and pagination params', () => {
    const component = new SearchBarComponent();
    const emit = vi.spyOn(component.searchChanged, 'emit');

    component.searchQuery = 'Clean Code';
    component.categoryQuery = 'Programming';
    component.onSearch();

    expect(emit).toHaveBeenCalledWith({
      search: 'Clean Code',
      category: 'Programming',
      page: 1,
      limit: 20,
    });
  });

  it('maps required price buckets to min and max values', () => {
    const component = new SearchBarComponent();
    const emit = vi.spyOn(component.searchChanged, 'emit');

    component.selectedPriceBucket = '100000-200000';
    component.onPriceBucketChange();

    expect(emit).toHaveBeenCalledWith({
      minPrice: 100000,
      maxPrice: 200000,
      page: 1,
      limit: 20,
    });
  });

  it('clears filters back to homepage search params', () => {
    const component = new SearchBarComponent();
    const emit = vi.spyOn(component.searchChanged, 'emit');

    component.searchQuery = 'Book';
    component.categoryQuery = 'Fiction';
    component.minPrice = 100000;
    component.onClearFilters();

    expect(emit).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });
});
