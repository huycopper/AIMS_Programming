/**
 * VietQR-specific models for the AIMS frontend.
 * Maps to the backend DTOs and response shapes.
 */

export interface VietQrPaymentRequest {
  qrDataURL: string;
  amount: number;
  content: string;
}

export interface PaymentConfirmationOrder {
  orderId: string;
  status: string;
  customerName: string;
  phoneNumber: string;
  shippingAddress: string;
  province: string;
  totalAmount: number;
  email: string;
}

export interface PaymentConfirmationTransaction {
  transactionId: string;
  paymentTransactionId: string;
  transactionReference: string;
  transactionContent: string;
  transactionDatetime: string;
  amount: number;
  paymentMethod: string;
  status: string;
}

export interface PaymentConfirmationResponse {
  status: string;
  message: string;
  orderId: string;
  order?: PaymentConfirmationOrder;
  transaction?: PaymentConfirmationTransaction;
}
