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

  constructor(
    private router: Router,
    private cartService: CartService,
  ) { }

  ngOnInit(): void {
    // Retrieve invoice data from router state (passed by DeliveryInfoScreen)
    const navigation = this.router.getCurrentNavigation();
    const state = history.state;

    if (state && state['invoiceData']) {
      this.invoiceData = state['invoiceData'];
      this.cart = state['cart'] || null;
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
    this.router.navigate(['/vietqr-payment'], {
      state: {
        orderId: this.invoiceData?.orderId
      }
    });
  }

  /**
   * Go back to delivery info form.
   */
  goBackToDelivery(): void {
    this.router.navigate(['/delivery']);
  }
}
