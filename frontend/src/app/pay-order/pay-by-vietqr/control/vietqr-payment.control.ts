import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { VietQrPaymentBoundary } from '../boundary/api/vietqr-payment.boundary';
import { VietQrPaymentStorageControl } from './vietqr-payment-storage.control';
import { CartService } from '../../../services/cart.service';
import { PaymentConfirmationResponse, VietQrPaymentRequest } from '../entity/vietqr-payment.models';

@Injectable({
  providedIn: 'root',
})
export class VietQrPaymentControl {
  constructor(
    private readonly vietQrPaymentBoundary: VietQrPaymentBoundary,
    private readonly storageControl: VietQrPaymentStorageControl,
    private readonly cartService: CartService
  ) {}

  requestPayment(orderId: string): Observable<VietQrPaymentRequest> {
    return this.vietQrPaymentBoundary.requestVietQrPayment(orderId);
  }

  getPaymentConfirmation(orderId: string): Observable<PaymentConfirmationResponse> {
    return this.vietQrPaymentBoundary.getPaymentConfirmation(orderId);
  }

  confirmVietQrPayment(orderId: string): Observable<PaymentConfirmationResponse> {
    return this.vietQrPaymentBoundary.confirmVietQrPayment(orderId);
  }

  isConfirmed(res: PaymentConfirmationResponse): boolean {
    return res.status === 'SUCCESS' && !!res.transaction;
  }

  applyPaymentSuccess(res: PaymentConfirmationResponse): void {
    this.cartService.emptyCart();
    this.storageControl.clearOrderingDrafts();
  }

  checkPaymentState(orderId: string): Observable<PaymentConfirmationResponse> {
    return this.getPaymentConfirmation(orderId).pipe(
      tap((res) => {
        if (this.isConfirmed(res)) {
          this.applyPaymentSuccess(res);
        }
      })
    );
  }

  confirmPayment(orderId: string): Observable<PaymentConfirmationResponse> {
    return this.confirmVietQrPayment(orderId).pipe(
      tap((res) => {
        if (this.isConfirmed(res)) {
          this.applyPaymentSuccess(res);
        }
      })
    );
  }

  pollConfirmation(orderId: string): Observable<PaymentConfirmationResponse> {
    const maxAttempts = 12;
    const delayMs = 500;

    return new Observable<PaymentConfirmationResponse>((subscriber) => {
      let attempt = 0;
      let timeoutId: any = null;

      const runPoll = () => {
        timeoutId = setTimeout(() => {
          this.getPaymentConfirmation(orderId).subscribe({
            next: (res) => {
              if (this.isConfirmed(res)) {
                this.applyPaymentSuccess(res);
                subscriber.next(res);
                subscriber.complete();
                return;
              }

              if (attempt < maxAttempts) {
                attempt++;
                runPoll();
                return;
              }

              subscriber.error(new Error('TIMEOUT'));
            },
            error: (err) => {
              subscriber.error(err);
            },
          });
        }, delayMs);
      };

      runPoll();

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    });
  }
}
