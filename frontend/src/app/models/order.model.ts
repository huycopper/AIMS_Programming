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

export interface AdminPaymentSummary {
  paymentTransactionId: string;
  paymentMethod: string;
  status: string;
  transactionRef: string | null;
  amount: number;
  createdAt: string;
}

export interface AdminRefundSummary {
  refundTransactionId: string;
  refundStatus: string;
  refundMethod: string;
  refundAmount: number;
  refundReason?: string | null;
  manualRefundNote?: string | null;
}

export interface PendingOrderRow {
  orderId: string;
  status: 'PENDING_PROCESSING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  province: string;
  address: string;
  itemCount: number;
  totalAmount: number;
  payment: AdminPaymentSummary | null;
  refund: AdminRefundSummary | null;
}

export interface PendingOrdersResponse {
  data: PendingOrderRow[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminOrderLineItem {
  orderItemId: string;
  productId: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
  weight: number;
  lineTotal: number;
  currentProduct: {
    productId: string;
    title: string;
    stockQuantity: number;
    status: string;
  } | null;
}

export interface StockConflict {
  productId: string;
  title: string;
  requested: number;
  available: number;
}

export interface AdminOrderDetail extends PendingOrderRow {
  deliveryInfo: DeliveryInfo;
  items: AdminOrderLineItem[];
  invoice: {
    subtotal: number;
    vat: number;
    shippingFee: number;
    totalAmount: number;
    totalWeight: number;
  };
  processedBy?: string | null;
  processedAt?: string | null;
  rejectionReason?: string | null;
  canApprove: boolean;
  canReject: boolean;
  stockConflicts: StockConflict[];
  stockResults?: Array<{
    productId: string;
    title: string;
    requested: number;
    previousStock: number;
    newStock: number;
  }>;
  notification?: {
    sent: boolean;
    skipped?: boolean;
    error?: string;
  };
}

export type {
  VietQrPaymentRequest,
  PaymentConfirmationOrder,
  PaymentConfirmationTransaction,
  PaymentConfirmationResponse,
} from '../pay-order/pay-by-vietqr/entity/vietqr-payment.models';
