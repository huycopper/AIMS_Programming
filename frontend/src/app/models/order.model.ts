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
  deliveryInfo: DeliveryInfo;
  cartItems: CartItemPayload[];
}
