import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-vietqr-payment-screen',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './vietqr-payment-screen.component.html',
  styleUrls: ['./vietqr-payment-screen.component.css'],
})
export class VietQRPaymentScreen implements OnInit {
  qrDataURL: string | null = null;
  safeQrUrl: SafeResourceUrl | null = null;
  loading: boolean = true;
  paymentSuccess: boolean = false;
  errorMessage: string | null = null;
  orderId: string = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cartService: CartService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    const state = history.state;
    if (state && state['orderId']) {
      this.orderId = state['orderId'];
    }

    if (!this.orderId) {
      this.loading = false;
      this.errorMessage = 'Không tìm thấy mã đơn hàng. Vui lòng đặt hàng từ giỏ hàng.';
      return;
    }

    this.requestPayment();
  }

  requestPayment() {
    this.loading = true;
    this.errorMessage = null;
    this.http.post<any>(`http://localhost:8080/api/payment/pay-order/${this.orderId}`, {})
      .subscribe({
        next: (res) => {
          this.qrDataURL = res.qrDataURL;
          if (this.qrDataURL) {
            this.safeQrUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.qrDataURL);
          }
          this.loading = false;
          this.cdr.detectChanges(); // reload lại giao diện
        },
        error: (err) => {
          console.error('Failed to get QR code', err);
          this.loading = false;
          this.errorMessage = 'Không thể tạo mã QR. Vui lòng thử lại sau.';
          this.cdr.detectChanges();
        }
      });
  }

  simulateCallback() {
    this.http.post('http://localhost:8080/api/vietqr/webhook', {
      orderId: this.orderId,
      amount: 100000,
      status: 'success',
      transactionRef: 'sandbox_txn_' + Date.now()
    }).subscribe({
      next: () => {
        this.paymentSuccess = true;
        this.cartService.emptyCart();
        setTimeout(() => {
          alert('Payment Successful!');
          this.router.navigate(['/']);
        }, 1500);
      },
      error: (err) => {
        console.error('Callback simulation failed', err);
      }
    });
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
