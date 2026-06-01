import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-vietqr-payment-screen',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './vietqr-payment-screen.component.html',
  styleUrls: ['./vietqr-payment-screen.component.css'],
})
export class VietQRPaymentScreen implements OnInit {
  qrDataURL: string | null = null;
  loading: boolean = true;
  paymentSuccess: boolean = false;

  // In a real flow, the orderId would come from state/routing after placing the order
  orderId: string = 'test-order-123';  // test mock data

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit() {
    this.requestPayment();
  }

  requestPayment() {
    this.loading = true;
    // Call our backend API to generate the QR
    this.http.post<any>(`http://localhost:3000/api/payment/pay-order/${this.orderId}`, {})
      .subscribe({
        next: (res) => {
          this.qrDataURL = res.qrDataURL;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to get QR code', err);
          this.loading = false;
        }
      });
  }

  simulateCallback() {
    // Sandbox simulation: manually trigger the webhook the banking system would send
    this.http.post('http://localhost:3000/api/vietqr/webhook', {
      orderId: this.orderId,
      amount: 100000,
      status: 'success',
      transactionRef: 'sandbox_txn_' + Date.now()
    }).subscribe({
      next: () => {
        this.paymentSuccess = true;
        setTimeout(() => {
          // Navigate to a success screen or home
          alert('Payment Successful!');
          this.router.navigate(['/']);
        }, 1500);
      },
      error: (err) => {
        console.error('Callback simulation failed', err);
      }
    });
  }
}
