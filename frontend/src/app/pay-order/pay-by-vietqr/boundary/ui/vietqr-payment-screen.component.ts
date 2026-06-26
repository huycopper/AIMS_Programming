import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { VietQrPaymentControl } from '../../control/vietqr-payment.control';
import { VietQrPaymentStorageControl } from '../../control/vietqr-payment-storage.control';
import { PaymentConfirmationResponse } from '../../entity/vietqr-payment.models';
import { CartService } from '../../../../services/cart.service';

@Component({
  selector: 'app-vietqr-payment-screen',
  standalone: true,
  imports: [CommonModule, RouterModule],
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentControl: VietQrPaymentControl,
    private storageControl: VietQrPaymentStorageControl,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private location: Location,
    private cartService: CartService
  ) {}

  /**
   * Get total quantity of items in cart for the header
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

  ngOnInit() {
    const state = history.state;
    const routeOrderId = this.route.snapshot.paramMap.get('orderId');
    this.orderId = routeOrderId || state?.['orderId'] || this.storageControl.loadCurrentOrderId();

    if (!this.orderId) {
      this.loading = false;
      this.errorMessage = 'Cannot find order id. Please try again.';
      return;
    }

    this.storageControl.saveCurrentOrderId(this.orderId);
    this.loadPaymentState();
  }

  requestPayment() {
    this.loading = true;
    this.errorMessage = null;

    this.paymentControl.requestPayment(this.orderId).subscribe({
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

    this.paymentControl.confirmPayment(this.orderId).subscribe({
      next: (res) => {
        console.log('Payment confirmation result:', res);

        if (this.paymentControl.isConfirmed(res)) {
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

  payWithPayPal() {
    alert('This feature is in progress');
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

    this.paymentControl.checkPaymentState(this.orderId).subscribe({
      next: (res) => {
        if (this.paymentControl.isConfirmed(res)) {
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

  private pollPaymentConfirmation(): void {
    this.paymentControl.pollConfirmation(this.orderId).subscribe({
      next: (res) => {
        this.applyPaymentSuccess(res);
      },
      error: (err) => {
        this.confirmingPayment = false;
        if (err?.message === 'TIMEOUT') {
          this.errorMessage = 'Payment has not been confirmed yet. Please try again after VietQR sends the transaction.';
        } else {
          console.error('Payment polling failed', err);
          this.errorMessage = 'Cannot check payment status. Please try again.';
        }
        this.cdr.detectChanges();
      },
    });
  }

  private applyPaymentSuccess(res: PaymentConfirmationResponse): void {
    this.confirmation = res;
    this.amount = res.order?.totalAmount ?? res.transaction?.amount ?? this.amount;
    this.paymentContent = res.transaction?.transactionContent ?? this.paymentContent;
    this.paymentSuccess = true;
    this.loading = false;
    this.confirmingPayment = false;
    this.errorMessage = null;
    this.cdr.detectChanges();
  }
}
