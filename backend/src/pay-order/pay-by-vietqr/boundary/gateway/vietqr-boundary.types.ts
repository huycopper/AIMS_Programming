import { Order } from '../../../../order/entities/order.entity.js';

export interface GenerateQrCodeResult {
  qrDataURL: string;
  amount: number;
  content: string;
}

export interface ApiCallbackResult {
  status: string;
  message: string;
}
