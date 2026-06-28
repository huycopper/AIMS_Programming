import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AdminOrderDetail,
  CartItemPayload,
  ShippingFeeResult,
  InvoiceData,
  DeliveryInfo,
  PendingOrdersResponse,
  PaymentConfirmationResponse,
  VietQrPaymentRequest,
} from '../models/order.model';
import { VietQrPaymentBoundary } from '../pay-order/pay-by-vietqr/boundary/api/vietqr-payment.boundary';

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
  private readonly adminOrdersApiUrl = 'http://localhost:8080/api/admin/orders';

  constructor(
    private readonly http: HttpClient,
    private readonly vietQrPaymentBoundary: VietQrPaymentBoundary,
  ) {}

  /**
   * AC-2: Calculate shipping fee dynamically.
   * Calls POST /api/orders/calculate-shipping
   */
  calculateShipping(
    province: string,
    address: string,
    cartItems: CartItemPayload[],
  ): Observable<ShippingFeeResult> {
    return this.http.post<ShippingFeeResult>(`${this.apiUrl}/calculate-shipping`, {
      province,
      address,
      cartItems,
    });
  }

  /**
   * AC-1 & AC-3: Place an order with delivery info and cart items.
   * Calls POST /api/orders/place
   */
  placeOrder(deliveryInfo: DeliveryInfo, cartItems: CartItemPayload[]): Observable<InvoiceData> {
    return this.http.post<InvoiceData>(`${this.apiUrl}/place`, {
      ...deliveryInfo,
      cartItems,
    });
  }

  /**
   * Fetches the invoice/order snapshot by internal order id.
   * Used by checkout/payment screens after an order has been placed.
   */
  getOrder(orderId: string): Observable<InvoiceData> {
    return this.http.get<InvoiceData>(`${this.apiUrl}/${orderId}`);
  }

  /**
   * Starts the VietQR payment flow for an existing order.
   * Delegates to the VietQR API boundary to keep payment-specific HTTP details isolated.
   */
  requestVietQrPayment(orderId: string): Observable<VietQrPaymentRequest> {
    return this.vietQrPaymentBoundary.requestVietQrPayment(orderId);
  }

  /**
   * Requests backend confirmation for a VietQR payment.
   * The backend checks whether the payment transaction has been matched successfully.
   */
  confirmVietQrPayment(orderId: string): Observable<PaymentConfirmationResponse> {
    return this.vietQrPaymentBoundary.confirmVietQrPayment(orderId);
  }

  /**
   * Retrieves the latest payment confirmation state for the order.
   * Used when the UI needs to refresh payment result information without starting a new payment.
   */
  getPaymentConfirmation(orderId: string): Observable<PaymentConfirmationResponse> {
    return this.vietQrPaymentBoundary.getPaymentConfirmation(orderId);
  }

  /**
   * Loads public customer order details from the email "View Order Details" link.
   * Uses orderViewToken, not cancelToken.
   */
  getCustomerOrderByToken(viewToken: string): Observable<any> {
    return this.http.get<any>(`http://localhost:8080/api/customer/orders/view/${viewToken}`);
  }

  /**
   * Chạy khi người dùng bấm nút confirm cancelation trên trang hủy đơn.
   * Nó dùng POST, nghĩa là có thay đổi dữ liệu trên backend.
   * Flow:
   * 1. Customer bấm nút “Confirm cancellation”.
   * 2. Component gọi cancelCustomerOrder(cancelToken).
   * 3. Backend kiểm tra token và trạng thái đơn hàng.
   * 4. Nếu hợp lệ, backend đổi trạng thái đơn sang CANCELLED,
   */
  cancelCustomerOrder(cancelToken: string): Observable<any> {
    return this.http.post<any>(
      `http://localhost:8080/api/customer/orders/cancel/${cancelToken}`,
      {},
    );
  }

  /**
   * Chạy khi người dùng mở trang hủy đơn
   * Nó dùng GET, nghĩa là chỉ lấy dữ liệu, chưa hủy đơn.
   * Flow:
   * 1. Customer bấm link hủy trong email: http://frontend/cancel-order/:cancelToken
   * 2. Component lấy cancelToken từ URL.
   * 3. Gọi getCustomerOrderByCancelToken(cancelToken).
   * 4 Backend trả về thông tin tóm tắt đơn hàng để hiển thị trước khi xác nhận hủy.
   */
  getCustomerOrderByCancelToken(cancelToken: string): Observable<any> {
    return this.http.get<any>(`http://localhost:8080/api/customer/orders/cancel/${cancelToken}`);
  }

  getPendingOrders(page = 1, limit = 30): Observable<PendingOrdersResponse> {
    const params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    return this.http.get<PendingOrdersResponse>(`${this.adminOrdersApiUrl}/pending`, { params });
  }

  getAdminOrderDetail(orderId: string): Observable<AdminOrderDetail> {
    return this.http.get<AdminOrderDetail>(`${this.adminOrdersApiUrl}/${orderId}`);
  }

  approveAdminOrder(orderId: string): Observable<AdminOrderDetail> {
    return this.http.post<AdminOrderDetail>(`${this.adminOrdersApiUrl}/${orderId}/approve`, {});
  }

  rejectAdminOrder(orderId: string, reason: string): Observable<AdminOrderDetail> {
    return this.http.post<AdminOrderDetail>(`${this.adminOrdersApiUrl}/${orderId}/reject`, {
      reason,
    });
  }
}
