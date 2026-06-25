import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VietQrPaymentStorageControl {
  private readonly currentOrderIdKey = 'aims_current_order_id';
  private readonly currentInvoiceKey = 'aims_current_invoice';
  private readonly deliveryDraftKey = 'aims_delivery_draft';

  loadCurrentOrderId(): string {
    if (typeof localStorage === 'undefined') return '';
    return localStorage.getItem(this.currentOrderIdKey) || '';
  }

  saveCurrentOrderId(orderId: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.currentOrderIdKey, orderId);
  }

  clearOrderingDrafts(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.currentOrderIdKey);
    localStorage.removeItem(this.currentInvoiceKey);
    localStorage.removeItem(this.deliveryDraftKey);
  }
}
