import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription, switchMap } from 'rxjs';
import { Product } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-product-detail-screen',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './product-detail-screen.html',
  styleUrl: './product-detail-screen.css',
})
export class ProductDetailScreen implements OnInit, OnDestroy {
  product: Product | null = null;
  quantity = 1;
  isLoading = true;
  errorMessage = '';
  addToCartMessage = '';
  isSuccessPopupOpen = false;
  cartItemCount = 0;
  private subscription?: Subscription;
  private cartSub?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly productService: ProductService,
    private readonly cartService: CartService,
    private readonly cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.cartSub = this.cartService.getCartObservable().subscribe(cart => {
      this.cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      this.cdr.markForCheck();
    });
    this.subscription = this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.isLoading = true;
          this.errorMessage = '';
          this.product = null;
          this.cdr.markForCheck();
          return this.productService.getProductById(params.get('productId') ?? '');
        }),
      )
      .subscribe({
        next: (product) => {
          this.product = product;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'Product is not found or unavailable.';
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.cartSub?.unsubscribe();
  }

  addToCart(): void {
    if (!this.product) return;

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
    this.addToCartMessage = '';
    this.isSuccessPopupOpen = true;

    if (this.popupTimeout) {
      clearTimeout(this.popupTimeout);
    }
    this.popupTimeout = setTimeout(() => {
      this.isSuccessPopupOpen = false;
      this.cdr.markForCheck();
    }, 3000);
  }

  private popupTimeout?: any;

  closeSuccessPopup(): void {
    this.isSuccessPopupOpen = false;
    if (this.popupTimeout) {
      clearTimeout(this.popupTimeout);
      this.popupTimeout = undefined;
    }
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(Number(value)) + ' VND';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Not provided';
    return new Intl.DateTimeFormat('vi-VN').format(new Date(value));
  }

  formatList(values: string[] | null | undefined): string {
    return values?.length ? values.join(', ') : 'Not provided';
  }
}
