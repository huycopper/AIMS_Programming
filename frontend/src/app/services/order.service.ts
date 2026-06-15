import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CartItemPayload,
  ShippingFeeResult,
  InvoiceData,
  DeliveryInfo,
  PaymentConfirmationResponse,
  VietQrPaymentRequest,
} from '../models/order.model';

/**
 * OrderService — Angular service acting as the client-side Control (BCE pattern).
 * Calls backend REST API endpoints for shipping calculation and order placement.
 */
@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly apiUrl = 'http://localhost:8080/api/orders';
  private readonly paymentApiUrl = 'http://localhost:8080/api/payment/pay-order';

  constructor(private readonly http: HttpClient) { }

  /**
   * AC-2: Calculate shipping fee dynamically.
   * Calls POST /api/orders/calculate-shipping
   */
  calculateShipping(
    province: string,
    address: string,
    cartItems: CartItemPayload[],
  ): Observable<ShippingFeeResult> {
    return this.http.post<ShippingFeeResult>(
      `${this.apiUrl}/calculate-shipping`,
      { province, address, cartItems },
    );
  }

  /**
   * AC-1 & AC-3: Place an order with delivery info and cart items.
   * Calls POST /api/orders/place
   */
  placeOrder(
    deliveryInfo: DeliveryInfo,
    cartItems: CartItemPayload[],
  ): Observable<InvoiceData> {
    return this.http.post<InvoiceData>(`${this.apiUrl}/place`, {
      ...deliveryInfo,
      cartItems,
    });
  }

  getOrder(orderId: string): Observable<InvoiceData> {
    return this.http.get<InvoiceData>(`${this.apiUrl}/${orderId}`);
  }

  requestVietQrPayment(orderId: string): Observable<VietQrPaymentRequest> {
    return this.http.post<VietQrPaymentRequest>(`${this.paymentApiUrl}/${orderId}`, {});
  }

  confirmVietQrPayment(orderId: string): Observable<PaymentConfirmationResponse> {
    return this.http.post<PaymentConfirmationResponse>(`${this.paymentApiUrl}/${orderId}/confirm`, {});
  }

  getPaymentConfirmation(orderId: string): Observable<PaymentConfirmationResponse> {
    return this.http.get<PaymentConfirmationResponse>(`${this.paymentApiUrl}/${orderId}/confirmation`);
  }

  getCustomerOrderByToken(viewToken: string): Observable<any> {
    return this.http.get<any>(`http://localhost:8080/api/customer/orders/view/${viewToken}`);
  }

  cancelCustomerOrder(cancelToken: string, reason?: string): Observable<any> {
    return this.http.post<any>(`http://localhost:8080/api/customer/orders/cancel/${cancelToken}`, { reason });
  }

  getCustomerOrderByCancelToken(cancelToken: string): Observable<any> {
    return this.http.get<any>(`http://localhost:8080/api/customer/orders/cancel/${cancelToken}`);
  }
}
