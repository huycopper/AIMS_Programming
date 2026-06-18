import { Order } from '../../../order/entities/order.entity.js';

export class VietQrPaymentCode {
  readonly shortOrderId: string;
  readonly amount: number;
  readonly content: string;

  constructor(shortOrderId: string, amount: number, content: string) {
    this.shortOrderId = shortOrderId;
    this.amount = amount;
    this.content = content;
  }

  static fromOrder(order: Order): VietQrPaymentCode {
    const shortOrderId = this.deriveShortOrderId(order.orderId);
    const amount = Math.round(Number(order.totalAmount));
    const content = this.derivePaymentContent(shortOrderId);
    return new VietQrPaymentCode(shortOrderId, amount, content);
  }

  static deriveShortOrderId(orderId: string): string {
    return orderId.replace(/-/g, '').substring(0, 13);
  }

  static derivePaymentContent(shortOrderId: string): string {
    return `AIMS ${shortOrderId}`;
  }

  validateMatches(callbackAmount: number, callbackContent: string): void {
    const roundedCallbackAmount = Math.round(Number(callbackAmount));

    if (!Number.isFinite(roundedCallbackAmount)) {
      throw new Error('Invalid transaction amount');
    }

    if (roundedCallbackAmount !== this.amount) {
      throw new Error(`Amount mismatch: expected ${this.amount}, received ${roundedCallbackAmount}`);
    }

    if (!callbackContent?.includes(this.content)) {
      throw new Error(`Content mismatch: expected content to include ${this.content}`);
    }
  }

  matchesCallback(callbackOrderId: string | undefined, callbackContent: string | undefined, fullOrderId: string): boolean {
    const trimmedCallbackOrderId = callbackOrderId?.trim();
    const content = callbackContent ?? '';

    return (
      fullOrderId === trimmedCallbackOrderId ||
      this.shortOrderId === trimmedCallbackOrderId ||
      content.includes(this.content)
    );
  }
}
