// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VietQrPaymentControl } from './vietqr-payment.control';
import { of, throwError } from 'rxjs';

describe('VietQrPaymentControl', () => {
  let control: VietQrPaymentControl;
  let mockBoundary: any;
  let mockStorage: any;
  let mockCart: any;

  beforeEach(() => {
    mockBoundary = {
      requestVietQrPayment: vi.fn(),
      confirmVietQrPayment: vi.fn(),
      getPaymentConfirmation: vi.fn()
    };

    mockStorage = {
      clearOrderingDrafts: vi.fn()
    };

    mockCart = {
      emptyCart: vi.fn()
    };

    control = new VietQrPaymentControl(mockBoundary, mockStorage, mockCart);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should check isConfirmed correctly', () => {
    const successRes = { status: 'SUCCESS', transaction: {} } as any;
    const pendingRes = { status: 'PENDING_CONFIRMATION' } as any;
    const successNoTx = { status: 'SUCCESS' } as any;

    expect(control.isConfirmed(successRes)).toBe(true);
    expect(control.isConfirmed(pendingRes)).toBe(false);
    expect(control.isConfirmed(successNoTx)).toBe(false);
  });

  it('should clean up cart and drafts on success', () => {
    control.applyPaymentSuccess({ status: 'SUCCESS', transaction: {} } as any);
    expect(mockCart.emptyCart).toHaveBeenCalled();
    expect(mockStorage.clearOrderingDrafts).toHaveBeenCalled();
  });

  it('should request payment', () => {
    mockBoundary.requestVietQrPayment.mockReturnValue(of({ qrDataURL: 'url' }));
    control.requestPayment('123').subscribe((res) => {
      expect(res.qrDataURL).toBe('url');
    });
    expect(mockBoundary.requestVietQrPayment).toHaveBeenCalledWith('123');
  });

  it('should poll status up to max attempts and timeout if not confirmed', () => {
    vi.useFakeTimers();

    mockBoundary.getPaymentConfirmation.mockReturnValue(of({ status: 'PENDING_CONFIRMATION' }));

    let emitted = false;
    let error: any = null;

    control.pollConfirmation('123').subscribe({
      next: () => { emitted = true; },
      error: (err) => { error = err; }
    });

    // Advance time for 12 polling attempts (each delay is 500ms)
    for (let i = 0; i <= 12; i++) {
      vi.advanceTimersByTime(500);
    }

    expect(emitted).toBe(false);
    expect(error?.message).toBe('TIMEOUT');
    expect(mockStorage.clearOrderingDrafts).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('should stop polling and return success when confirmed', () => {
    vi.useFakeTimers();

    // First call returns pending, second returns success
    let callCount = 0;
    mockBoundary.getPaymentConfirmation.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return of({ status: 'PENDING_CONFIRMATION' });
      }
      return of({ status: 'SUCCESS', transaction: {} });
    });

    let result: any = null;

    control.pollConfirmation('123').subscribe({
      next: (res) => { result = res; }
    });

    vi.advanceTimersByTime(500); // 1st poll: pending
    expect(result).toBeNull();

    vi.advanceTimersByTime(500); // 2nd poll: success
    expect(result?.status).toBe('SUCCESS');
    expect(mockCart.emptyCart).toHaveBeenCalled();
    expect(mockStorage.clearOrderingDrafts).toHaveBeenCalled();

    vi.useRealTimers();
  });
});
