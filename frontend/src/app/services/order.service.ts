import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CartItemPayload,
  ShippingFeeResult,
  InvoiceData,
  DeliveryInfo,
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
}
