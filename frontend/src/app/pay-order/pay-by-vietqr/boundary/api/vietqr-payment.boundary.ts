import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  VietQrPaymentRequest,
  PaymentConfirmationResponse,
} from '../../entity/vietqr-payment.models';

@Injectable({
  providedIn: 'root',
})
export class VietQrPaymentBoundary {
  private readonly paymentApiUrl = 'http://localhost:8080/api/payment/pay-order';

  constructor(private readonly http: HttpClient) {}

  requestVietQrPayment(orderId: string): Observable<VietQrPaymentRequest> {
    return this.http.post<VietQrPaymentRequest>(`${this.paymentApiUrl}/${orderId}`, {});
  }

  confirmVietQrPayment(orderId: string): Observable<PaymentConfirmationResponse> {
    return this.http.post<PaymentConfirmationResponse>(`${this.paymentApiUrl}/${orderId}/confirm`, {});
  }

  getPaymentConfirmation(orderId: string): Observable<PaymentConfirmationResponse> {
    return this.http.get<PaymentConfirmationResponse>(`${this.paymentApiUrl}/${orderId}/confirmation`);
  }
}
