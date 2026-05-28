import { Component, Input } from '@angular/core';
import { Product } from '../../models/product.model';
import { CartService } from '../../services/cart.service';

/**
 * ProductItemComponent — Boundary class (BCE pattern).
 * Renders a single product card with type-specific information.
 * Maps to the product card UI element in the Homepage screen specification.
 */
@Component({
  selector: 'app-product-item',
  standalone: true,
  templateUrl: './product-item.html',
  styleUrl: './product-item.css',
})
export class ProductItemComponent {
  @Input({ required: true }) product!: Product;

  constructor(private cartService: CartService) {}

  addToCart(event?: Event, quantity: number = 1): void {
    if (event) {
      event.stopPropagation(); // Prevent navigating to product detail
    }
    if (this.product.stockQuantity > 0) {
      this.cartService.addItem(this.product, quantity);
    }
  }

  /**
   * Returns the secondary label (author/director/artist) based on product type.
   * As defined in Screen Spec field #5: "Product author (card)".
   */
  getSecondaryLabel(): string {
    switch (this.product.productType) {
      case 'BOOK':
        return this.product.book?.authors?.join(', ') ?? '';
      case 'CD':
        return this.product.cd?.artists?.join(', ') ?? '';
      case 'DVD':
        return this.product.dvd?.director ?? '';
      case 'NEWSPAPER':
        return this.product.newspaper?.publisher ?? '';
      default:
        return '';
    }
  }

  /**
   * Returns a CSS class name based on product type for visual differentiation.
   */
  getTypeBadgeClass(): string {
    return `badge-${this.product.productType.toLowerCase()}`;
  }

  /**
   * Format price to VND currency format: #,### VND
   * As defined in Screen Spec field #6.
   */
  formatPrice(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value) + ' VND';
  }
}
