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

  constructor(private readonly http: HttpClient) { }

  /**
   * Yêu cầu backend tạo thông tin thanh toán VietQR cho đơn hàng.
   * Kết quả trả về thường gồm mã QR, số tiền và nội dung chuyển khoản.
   */
  requestVietQrPayment(orderId: string): Observable<VietQrPaymentRequest> {
    return this.http.post<VietQrPaymentRequest>(`${this.paymentApiUrl}/${orderId}`, {});
  }

  /**
   * Gửi yêu cầu xác nhận thanh toán sau khi người dùng bấm "I have paid".
   * Backend sẽ kiểm tra giao dịch VietQR tương ứng với đơn hàng.
   */
  confirmVietQrPayment(orderId: string): Observable<PaymentConfirmationResponse> {
    // Hàm này sẽ tạo POST tới ${this.paymentApiUrl}/${orderId}/confirm có body là {}
    // PaymentConfirmationResponse là kiểu dữ liệu response từ BE được kì vọng trả về
    return this.http.post<PaymentConfirmationResponse>(`${this.paymentApiUrl}/${orderId}/confirm`, {});
  }

  /**
   * Lấy trạng thái xác nhận thanh toán mới nhất của đơn hàng.
   * Được dùng khi mở màn hình VietQR hoặc khi polling chờ giao dịch được ghi nhận.
   */
  getPaymentConfirmation(orderId: string): Observable<PaymentConfirmationResponse> {
    return this.http.get<PaymentConfirmationResponse>(`${this.paymentApiUrl}/${orderId}/confirmation`);
  }
}
