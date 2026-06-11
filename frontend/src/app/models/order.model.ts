/**
 * Order-related models for the AIMS frontend.
 * Maps to the backend DTOs and response shapes.
 */

export interface DeliveryInfo {
  name: string;
  phone: string;
  email: string;
  province: string;
  address: string;
  note?: string;
}

export interface CartItemPayload {
  productId: string;
  productTitle?: string;
  quantity: number;
  weight: number;
  currentPrice: number;
}

export interface ShippingFeeResult {
  totalWeight: number;
  isInnerCity: boolean;
  baseFee: number;
  additionalFee: number;
  grossShipping: number;
  discount: number;
  shippingFee: number;
  subtotal: number;
  vat: number;
  totalAmount: number;
}

export interface InvoiceData extends ShippingFeeResult {
  orderId?: string;
  deliveryInfo: DeliveryInfo;
  cartItems: CartItemPayload[];
}

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
