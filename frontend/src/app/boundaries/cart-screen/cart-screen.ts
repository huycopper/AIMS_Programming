import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { Cart } from '../../models/cart.model';
import { Product } from '../../models/product.model';
import { catchError, forkJoin, map, of, Subscription } from 'rxjs';
import { TopBarComponent } from '../../shared/top-bar/top-bar';

interface StockShortageWarning {
  productId: string;
  title: string;
  requested: number;
  available: number;
  lacking: number;
}

@Component({
  selector: 'app-cart-screen',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TopBarComponent],
  templateUrl: './cart-screen.html',
  styleUrl: './cart-screen.css'
})
export class CartScreen implements OnInit, OnDestroy {
  cart: Cart | null = null;
  totalExclVAT: number = 0;
  totalWeight: number = 0;
  isLoading: boolean = false;
  insufficientStockItems: { [productId: string]: StockShortageWarning } = {};
  checkoutError = '';
  private subscription: Subscription | null = null;
  private refreshSubscription: Subscription | null = null;

  get cartItemCount(): number {
    return this.cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  }

  constructor(
    private cartService: CartService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private productService: ProductService,
  ) { }

  ngOnInit(): void {
    this.subscription = this.cartService.getCartObservable().subscribe(cart => {
      this.cart = cart;
      this.totalExclVAT = cart.calculateSubTotal();
      this.totalWeight = cart.getTotalWeight();
      this.recalculateStockWarnings();
      this.cdr?.markForCheck();
    });
    this.refreshCartProductSnapshots();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.refreshSubscription?.unsubscribe();
  }

  updateQuantity(productId: string, quantity: number): void {
    this.cartService.updateQuantity(productId, quantity);
  }

  removeItem(productId: string): void {
    this.cartService.removeItem(productId);
    delete this.insufficientStockItems[productId];
  }

  handleQuantityChange(productId: string, newQuantity: number): void {
    this.checkoutError = '';
    this.updateQuantity(productId, Number(newQuantity));
    this.recalculateStockWarnings();
  }

  askToPlaceOrder(): void {
    this.recalculateStockWarnings();
    if (this.hasUnresolvedShortages()) {
      this.checkoutError = 'Please update the cart before delivery. Some products lack stock.';
      this.cdr?.markForCheck();
      return;
    }
    this.router.navigate(['/delivery']);
  }

  hasUnresolvedShortages(): boolean {
    return Object.keys(this.insufficientStockItems).length > 0;
  }

  private refreshCartProductSnapshots(): void {
    const items = this.cartService.getCart().items;
    if (items.length === 0) return;

    this.isLoading = true;
    this.refreshSubscription = forkJoin(
      items.map((item) =>
        this.productService.getProductById(item.product.productId).pipe(
          map((product) => ({ product })),
          catchError(() => of({ product: { ...item.product, stockQuantity: 0 } as Product })),
        ),
      ),
    ).subscribe({
      next: (results) => {
        results.forEach(({ product }) => this.cartService.updateProductSnapshot(product));
        this.isLoading = false;
        this.recalculateStockWarnings();
        this.cdr?.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.recalculateStockWarnings();
        this.cdr?.markForCheck();
      },
    });
  }

  private recalculateStockWarnings(): void {
    const warnings: { [productId: string]: StockShortageWarning } = {};
    for (const item of this.cart?.items ?? []) {
      const requested = Number(item.quantity);
      const available = Number(item.product.stockQuantity) || 0;
      if (requested > available) {
        warnings[item.product.productId] = {
          productId: item.product.productId,
          title: item.product.title,
          requested,
          available,
          lacking: requested - available,
        };
      }
    }
    this.insufficientStockItems = warnings;
  }

  formatPrice(price: any): string {
    const numPrice = Number(price);
    if (isNaN(numPrice)) {
      return price + '₫';
    }
    return numPrice.toLocaleString('vi-VN') + '₫';
  }
}
