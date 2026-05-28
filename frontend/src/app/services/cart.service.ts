import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Cart } from '../models/cart.model';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cart = new Cart();
  private cartSubject = new BehaviorSubject<Cart>(this.cart);

  constructor() {
    this.loadFromLocalStorage();
  }

  getCartObservable(): Observable<Cart> {
    return this.cartSubject.asObservable();
  }

  getCart(): Cart {
    return this.cart;
  }

  addItem(product: Product, quantity: number): void {
    this.cart.addItem(product, quantity);
    this.updateState();
  }

  updateQuantity(productId: string, quantity: number): void {
    this.cart.updateQuantity(productId, quantity);
    this.updateState();
  }

  removeItem(productId: string): void {
    this.cart.removeItem(productId);
    this.updateState();
  }

  emptyCart(): void {
    this.cart.emptyCart();
    this.updateState();
  }

  private updateState(): void {
    this.saveToLocalStorage();
    this.cartSubject.next(this.cart);
  }

  private saveToLocalStorage(): void {
    if (typeof localStorage !== 'undefined') {
      const itemsToSave = this.cart.items.map(item => ({
        product: item.product,
        quantity: item.quantity
      }));
      localStorage.setItem('aims_cart', JSON.stringify(itemsToSave));
    }
  }

  private loadFromLocalStorage(): void {
    if (typeof localStorage === 'undefined') return;
    const saved = localStorage.getItem('aims_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach(item => {
            if (item.product && item.quantity) {
              // Bypass addItem stock limits for initial load in case product is not available
              // or just rely on addItem and it will cap at stock limit
              this.cart.addItem(item.product, item.quantity);
            }
          });
          this.cartSubject.next(this.cart);
        }
      } catch (e) {
        console.error('Failed to parse cart from local storage', e);
      }
    }
  }
}
