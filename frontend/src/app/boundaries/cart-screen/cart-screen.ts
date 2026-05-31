import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart.service';
import { Cart } from '../../models/cart.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cart-screen',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cart-screen.html',
  styleUrl: './cart-screen.css'
})
export class CartScreen implements OnInit, OnDestroy {
  cart: Cart | null = null;
  totalExclVAT: number = 0;
  totalWeight: number = 0;
  isLoading: boolean = false;
  insufficientStockItem: { [productId: string]: number } = {};
  private subscription: Subscription | null = null;

  constructor(private cartService: CartService, private router: Router) { }

  ngOnInit(): void {
    this.subscription = this.cartService.getCartObservable().subscribe(cart => {
      this.cart = cart;
      this.totalExclVAT = cart.calculateSubTotal();
      this.totalWeight = cart.getTotalWeight();
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  updateQuantity(productId: string, quantity: number): void {
    this.cartService.updateQuantity(productId, quantity);
  }

  removeItem(productId: string): void {
    this.cartService.removeItem(productId);
    if (this.insufficientStockItem[productId]) {
      delete this.insufficientStockItem[productId];
    }
  }

  handleQuantityChange(productId: string, newQuantity: number, stockQuantity: number): void {
    if (newQuantity > stockQuantity) {
      this.insufficientStockItem[productId] = stockQuantity;
      // Revert the input value visual by triggering a change or it just won't update
      // We'll update to max available
      this.updateQuantity(productId, stockQuantity);
    } else {
      delete this.insufficientStockItem[productId];
      this.updateQuantity(productId, newQuantity);
    }
  }

  askToPlaceOrder(): void {
    this.router.navigate(['/delivery']);
  }

  formatPrice(price: number): string {
    if (isNaN(price)) {
      return price + '₫';
    }
    return price.toLocaleString('vi-VN') + '₫';
  }
}
