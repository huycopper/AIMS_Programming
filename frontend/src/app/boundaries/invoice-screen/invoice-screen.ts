import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { InvoiceData } from '../../models/order.model';
import { Cart } from '../../models/cart.model';
import { CartService } from '../../services/cart.service';

/**
 * InvoiceScreen — Boundary component (BCE pattern).
 * Displays the full invoice breakdown after the customer submits delivery info:
 * - List of products (title, quantity, unit price, line total)
 * - Subtotal (excl. VAT)
 * - 10% VAT
 * - Shipping fee
 * - Total amount to pay
 * - Delivery information summary
 */
@Component({
  selector: 'app-invoice-screen',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './invoice-screen.html',
  styleUrl: './invoice-screen.css',
})
export class InvoiceScreen implements OnInit {
  invoiceData: InvoiceData | null = null;
  cart: Cart | null = null;
  displayItems: Array<{ title: string; quantity: number; unitPrice: number }> = [];
  private readonly currentInvoiceKey = 'aims_current_invoice';
  private readonly currentOrderIdKey = 'aims_current_order_id';

  constructor(
    private router: Router,
    private cartService: CartService,
  ) { }

  /**
   * Calculate total quantity of items in cart for header badge
   */
  getTotalQuantity(): number {
    return this.cartService.getCart().items.reduce((total, item) => total + Number(item.quantity), 0);
  }

  /**
   * Format price to VND currency string
   */
  formatPrice(price: any): string {
    const numPrice = Number(price);
    if (isNaN(numPrice)) {
      return price + '₫';
    }
    return numPrice.toLocaleString('vi-VN') + '₫';
  }

  ngOnInit(): void {
    // Retrieve invoice data from router state (passed by DeliveryInfoScreen)
    const state = history.state;

    if (state && state['invoiceData']) {
      this.setInvoiceData(state['invoiceData'], state['cart'] || null);
      this.saveCurrentInvoice(state['invoiceData']);
    } else if (this.loadStoredInvoice()) {
      return;
    } else {
      // If no invoice data, redirect back to cart
      this.router.navigate(['/cart']);
    }
  }

  /**
   * Confirm order and proceed to payment
   */
  confirmOrder(): void {
    // VietQR is the default payment method.
    // Emptying the cart will be done when payment is successful
    const orderId = this.invoiceData?.orderId;
    if (!orderId) {
      this.router.navigate(['/cart']);
      return;
    }

    this.saveCurrentInvoice(this.invoiceData);
    this.router.navigate(['/vietqr-payment', orderId], {
      state: {
        orderId,
      }
    });
  }

  /**
   * Go back to delivery info form.
   */
  goBackToDelivery(): void {
    this.router.navigate(['/delivery']);
  }

  private setInvoiceData(invoiceData: InvoiceData, cart: Cart | null): void {
    this.invoiceData = invoiceData;
    this.cart = cart;
    this.displayItems = this.buildDisplayItems(invoiceData, cart);
  }

  private buildDisplayItems(invoiceData: InvoiceData, cart: Cart | null): Array<{ title: string; quantity: number; unitPrice: number }> {
    if (cart?.items?.length) {
      return cart.items.map((item) => ({
        title: item.product.title,
        quantity: Number(item.quantity),
        unitPrice: Number(item.product.currentPrice),
      }));
    }

    return (invoiceData.cartItems || []).map((item) => ({
      title: item.productTitle || item.productId,
      quantity: Number(item.quantity),
      unitPrice: Number(item.currentPrice),
    }));
  }

  private saveCurrentInvoice(invoiceData: InvoiceData | null): void {
    if (typeof localStorage === 'undefined' || !invoiceData) return;

    localStorage.setItem(this.currentInvoiceKey, JSON.stringify(invoiceData));
    if (invoiceData.orderId) {
      localStorage.setItem(this.currentOrderIdKey, invoiceData.orderId);
    }
  }

  private loadStoredInvoice(): boolean {
    if (typeof localStorage === 'undefined') return false;

    const savedInvoice = localStorage.getItem(this.currentInvoiceKey);
    if (!savedInvoice) return false;

    try {
      const invoiceData = JSON.parse(savedInvoice) as InvoiceData;
      this.setInvoiceData(invoiceData, null);
      return true;
    } catch {
      localStorage.removeItem(this.currentInvoiceKey);
      return false;
    }
  }
}
