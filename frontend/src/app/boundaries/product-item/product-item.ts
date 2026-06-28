import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  imports: [FormsModule],
  templateUrl: './product-item.html',
  styleUrl: './product-item.css',
})
export class ProductItemComponent {
  @Input({ required: true }) product!: Product;
  quantity = 1;
  addToCartMessage = '';

  constructor(
    private readonly cartService: CartService,
    private readonly router: Router,
  ) {}

  openProductDetail(): void {
    this.router.navigate(['/products', this.product.productId]);
  }

  addToCart(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const requestedQuantity = Number(this.quantity);
    if (!Number.isFinite(requestedQuantity) || requestedQuantity < 1) {
      this.addToCartMessage = 'Enter a quantity of at least 1.';
      return;
    }

    if (this.product.stockQuantity <= 0) {
      this.addToCartMessage = 'This product is out of stock.';
      return;
    }

    const normalizedQuantity = Math.floor(requestedQuantity);
    const existingQuantity =
      this.cartService.getCart().getItem(this.product.productId)?.quantity ?? 0;
    const remainingQuantity = this.product.stockQuantity - existingQuantity;

    if (remainingQuantity <= 0) {
      this.addToCartMessage = `You already have all ${this.product.stockQuantity} available units in your cart.`;
      return;
    }

    if (normalizedQuantity > remainingQuantity) {
      this.addToCartMessage =
        existingQuantity > 0
          ? `You already have ${existingQuantity} in cart. You can add at most ${remainingQuantity} more.`
          : `Only ${this.product.stockQuantity} units are in stock. Please enter ${this.product.stockQuantity} or less.`;
      return;
    }

    this.cartService.addItem(this.product, normalizedQuantity);
    this.addToCartMessage = `Added ${normalizedQuantity} to cart.`;
  }

  stopCardAction(event: Event): void {
    event.stopPropagation();
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
