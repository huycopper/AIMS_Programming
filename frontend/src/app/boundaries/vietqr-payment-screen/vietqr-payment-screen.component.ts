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
  amount: number | null = null;
  loading: boolean = true;
  paymentSuccess: boolean = false;
  confirmingPayment: boolean = false; // Trạng thái đang xác nhận thanh toán
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
      this.errorMessage = 'Cannot find order id. Please try again.';
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
          this.amount = res.amount;
          if (this.qrDataURL) {
            this.safeQrUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.qrDataURL);
          }
          this.loading = false;
          this.cdr.detectChanges(); // reload lại giao diện
        },
        error: (err) => {
          console.error('Failed to get QR code', err);
          this.loading = false;
          this.errorMessage = 'Cannot generate QR code. Please try again.';
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Bước 2 trong Sequence Diagram v2: confirmPayment()
   * 
   * Thay vì simulateCallback cũ gọi trực tiếp webhook,
   * giờ gọi Backend endpoint confirmPayment để trigger luồng:
   * 
   * Frontend (confirmPayment) 
   *   → Backend POST /api/payment/pay-order/:orderId/confirm
   *   → PayOrderController.confirmPayment(order)
   *   → PayThroughPaymentGatewayController.confirmPayment(order)
   *   → PayThroughPaymentGatewayController.handleAPICallback(order)
   *   → VietQRBoundary.postAPICallback(order, accessToken) (gọi API Test Callback)
   *   → VietQR Sandbox nhận request → tự gọi Transaction Sync về AIMS
   *   → TransactionSyncController nhận callback → lưu PaymentTransaction + update order status
   *   → Kết quả trả về Frontend → hiển thị SuccessfulPaidScreen
   */
  confirmPayment() {
    this.confirmingPayment = true;
    this.errorMessage = null;

    this.http.post<any>(`http://localhost:8080/api/payment/pay-order/${this.orderId}/confirm`, {})
      .subscribe({
        next: (res) => {
          console.log('Payment confirmation result:', res);
          this.confirmingPayment = false;

          if (res.status === 'SUCCESS') {
            this.paymentSuccess = true;
            this.cartService.emptyCart();
            this.cdr.detectChanges();
          } else {
            this.errorMessage = `Payment confirmation failed: ${res.message || 'Unknown error'}`;
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          console.error('Payment confirmation failed', err);
          this.confirmingPayment = false;
          this.errorMessage = 'Payment confirmation failed. Please try again.';
          this.cdr.detectChanges();
        }
      });
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
