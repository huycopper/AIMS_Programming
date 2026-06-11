import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { OrderService } from '../../services/order.service';
import { PaymentConfirmationResponse } from '../../models/order.model';

@Component({
  selector: 'app-vietqr-payment-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vietqr-payment-screen.component.html',
  styleUrls: ['./vietqr-payment-screen.component.css'],
})
export class VietQRPaymentScreen implements OnInit {
  qrDataURL: string | null = null;
  safeQrUrl: SafeResourceUrl | null = null;
  amount: number | null = null;
  paymentContent: string | null = null;
  loading = true;
  paymentSuccess = false;
  confirmingPayment = false;
  errorMessage: string | null = null;
  orderId = '';
  confirmation: PaymentConfirmationResponse | null = null;

  private readonly currentOrderIdKey = 'aims_current_order_id';
  private readonly currentInvoiceKey = 'aims_current_invoice';
  private readonly deliveryDraftKey = 'aims_delivery_draft';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private cartService: CartService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private location: Location
  ) { }

  ngOnInit() {
    const state = history.state;
    const routeOrderId = this.route.snapshot.paramMap.get('orderId');
    this.orderId = routeOrderId || state?.['orderId'] || this.loadCurrentOrderId();

    if (!this.orderId) {
      this.loading = false;
      this.errorMessage = 'Cannot find order id. Please try again.';
      return;
    }

    this.saveCurrentOrderId(this.orderId);
    this.loadPaymentState();
  }

  requestPayment() {
    this.loading = true;
    this.errorMessage = null;

    this.orderService.requestVietQrPayment(this.orderId).subscribe({
      next: (res) => {
        this.qrDataURL = res.qrDataURL;
        this.amount = res.amount;
        this.paymentContent = res.content;
        if (this.qrDataURL) {
          this.safeQrUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.qrDataURL);
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to get QR code', err);
        this.loading = false;
        this.errorMessage = 'Cannot generate QR code. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  confirmPayment() {
    this.confirmingPayment = true;
    this.errorMessage = null;

    this.orderService.confirmVietQrPayment(this.orderId).subscribe({
      next: (res) => {
        console.log('Payment confirmation result:', res);

        if (this.isConfirmed(res)) {
          this.applyPaymentSuccess(res);
          return;
        }

        this.pollPaymentConfirmation();
      },
      error: (err) => {
        console.error('Payment confirmation failed', err);
        this.confirmingPayment = false;
        this.errorMessage = 'Payment confirmation failed. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  goHome() {
    this.router.navigate(['/']);
  }

  goBack() {
    this.location.back();
  }

  formatTransactionDate(value?: string): string {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('vi-VN');
  }

  private loadPaymentState(): void {
    this.loading = true;

    this.orderService.getPaymentConfirmation(this.orderId).subscribe({
      next: (res) => {
        if (this.isConfirmed(res)) {
          this.applyPaymentSuccess(res);
          return;
        }

        this.requestPayment();
      },
      error: () => {
        this.requestPayment();
      },
    });
  }

  private pollPaymentConfirmation(attempt = 0): void {
    const maxAttempts = 12;
    const delayMs = 500;

    setTimeout(() => {
      this.orderService.getPaymentConfirmation(this.orderId).subscribe({
        next: (res) => {
          if (this.isConfirmed(res)) {
            this.applyPaymentSuccess(res);
            return;
          }

          if (attempt < maxAttempts) {
            this.pollPaymentConfirmation(attempt + 1);
            return;
          }

          this.confirmingPayment = false;
          this.errorMessage = 'Payment has not been confirmed yet. Please try again after VietQR sends the transaction.';
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Payment polling failed', err);
          this.confirmingPayment = false;
          this.errorMessage = 'Cannot check payment status. Please try again.';
          this.cdr.detectChanges();
        },
      });
    }, delayMs);
  }

  private applyPaymentSuccess(res: PaymentConfirmationResponse): void {
    this.confirmation = res;
    this.amount = res.order?.totalAmount ?? res.transaction?.amount ?? this.amount;
    this.paymentContent = res.transaction?.transactionContent ?? this.paymentContent;
    this.paymentSuccess = true;
    this.loading = false;
    this.confirmingPayment = false;
    this.errorMessage = null;
    this.cartService.emptyCart();
    this.clearOrderingDrafts();
    this.cdr.detectChanges();
  }

  private isConfirmed(res: PaymentConfirmationResponse): boolean {
    return res.status === 'SUCCESS' && !!res.transaction;
  }

  private loadCurrentOrderId(): string {
    if (typeof localStorage === 'undefined') return '';
    return localStorage.getItem(this.currentOrderIdKey) || '';
  }

  private saveCurrentOrderId(orderId: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.currentOrderIdKey, orderId);
  }

  private clearOrderingDrafts(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.currentOrderIdKey);
    localStorage.removeItem(this.currentInvoiceKey);
    localStorage.removeItem(this.deliveryDraftKey);
  }
}
