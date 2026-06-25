// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VietQrPaymentStorageControl } from './vietqr-payment-storage.control';

describe('VietQrPaymentStorageControl', () => {
  let control: VietQrPaymentStorageControl;

  beforeEach(() => {
    control = new VietQrPaymentStorageControl();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should save and load current order ID', () => {
    control.saveCurrentOrderId('test-order-123');
    expect(control.loadCurrentOrderId()).toBe('test-order-123');
  });

  it('should clear ordering drafts', () => {
    control.saveCurrentOrderId('test-order-123');
    localStorage.setItem('aims_current_invoice', 'test-invoice');
    localStorage.setItem('aims_delivery_draft', 'test-draft');

    control.clearOrderingDrafts();

    expect(control.loadCurrentOrderId()).toBe('');
    expect(localStorage.getItem('aims_current_invoice')).toBeNull();
    expect(localStorage.getItem('aims_delivery_draft')).toBeNull();
  });
});
