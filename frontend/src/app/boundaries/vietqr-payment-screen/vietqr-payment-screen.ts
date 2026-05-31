import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InvoiceData } from '../../models/order.model';
import { Cart } from '../../models/cart.model';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-vietqr-payment-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vietqr-payment-screen.html',
  styleUrl: './vietqr-payment-screen.css',
})
export class VietqrPaymentScreen implements OnInit, OnDestroy {
  invoiceData: InvoiceData | null = null;
  cart: Cart | null = null;
  qrCodeUrl: string | null = null;
  isPolling = false;
  private pollInterval: any;
  paymentStatus: 'waiting' | 'success' | 'failed' = 'waiting';
  orderId: number | null = null;

  constructor(
    private router: Router,
    private cartService: CartService,
  ) {}

  ngOnInit(): void {
    const state = history.state;
    if (state && state['invoiceData']) {
      this.invoiceData = state['invoiceData'];
      this.cart = state['cart'] || null;
      this.initiatePayment();
    } else {
      this.router.navigate(['/cart']);
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  async initiatePayment() {
    try {
      // POST to our new backend controller to start payment process
      const response = await fetch('/api/pay-vietqr/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryInfo: this.invoiceData!.deliveryInfo,
          items: this.cart!.items,
          shippingFee: this.invoiceData!.shippingFee,
          subtotal: this.invoiceData!.subtotal,
          vat: this.invoiceData!.vat,
          totalAmount: this.invoiceData!.totalAmount,
        }),
      });
      if (!response.ok) throw new Error('Failed to initiate payment');
      
      const data = await response.json();
      this.qrCodeUrl = data.qrCodeUrl;
      this.orderId = data.orderId;

      this.startPolling();
    } catch (e) {
      console.error(e);
      this.paymentStatus = 'failed';
    }
  }

  startPolling() {
    this.isPolling = true;
    this.pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/orders/${this.orderId}/status`);
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.status === 'PENDING_PROCESSING') {
          this.stopPolling();
          this.paymentStatus = 'success';
          this.cartService.emptyCart();
          this.router.navigate(['/success'], { state: { orderId: this.orderId, invoiceData: this.invoiceData } });
        }
      } catch (e) {
        console.error('Polling error', e);
      }
    }, 3000);
  }

  stopPolling() {
    this.isPolling = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
}
