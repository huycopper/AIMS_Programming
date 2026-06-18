// @vitest-environment jsdom
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { VietQRPaymentScreen } from './vietqr-payment-screen.component';
import { of, throwError } from 'rxjs';

describe('VietQRPaymentScreen (unit)', () => {
  let component: VietQRPaymentScreen;
  let mockActivatedRoute: any;
  let mockRouter: any;
  let mockOrderService: any;
  let mockCartService: any;
  let mockSanitizer: any;
  let mockCdr: any;
  let mockLocation: any;

  beforeEach(() => {
    localStorage.clear();

    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue('test-order-123')
        }
      }
    };

    mockRouter = {
      navigate: vi.fn()
    };

    mockOrderService = {
      requestVietQrPayment: vi.fn().mockReturnValue(of({
        qrDataURL: 'data:image/png;base64,fake-qr-data',
        amount: 132000,
        content: 'AIMS 1234'
      })),
      confirmVietQrPayment: vi.fn().mockReturnValue(of({
        status: 'PENDING_CONFIRMATION',
        message: 'Waiting for sync'
      })),
      getPaymentConfirmation: vi.fn().mockReturnValue(of({
        status: 'PENDING_CONFIRMATION',
        message: 'No transaction yet'
      }))
    };

    mockCartService = {
      emptyCart: vi.fn()
    };

    mockSanitizer = {
      bypassSecurityTrustResourceUrl: vi.fn().mockImplementation((val) => val)
    };

    mockCdr = {
      detectChanges: vi.fn()
    };

    mockLocation = {
      back: vi.fn()
    };

    component = new VietQRPaymentScreen(
      mockActivatedRoute,
      mockRouter,
      mockOrderService,
      mockCartService,
      mockSanitizer,
      mockCdr,
      mockLocation
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display error state if orderId is missing', () => {
    mockActivatedRoute.snapshot.paramMap.get = vi.fn().mockReturnValue(null);
    // Safe mock for history.state in test environment
    Object.defineProperty(history, 'state', {
      value: {},
      configurable: true
    });

    component.ngOnInit();

    expect(component.loading).toBe(false);
    expect(component.errorMessage).toBe('Cannot find order id. Please try again.');
  });

  it('should request and load QR code if status is not confirmed on init', () => {
    component.ngOnInit();

    expect(mockOrderService.getPaymentConfirmation).toHaveBeenCalledWith('test-order-123');
    expect(mockOrderService.requestVietQrPayment).toHaveBeenCalledWith('test-order-123');
    expect(component.qrDataURL).toBe('data:image/png;base64,fake-qr-data');
    expect(component.amount).toBe(132000);
    expect(component.paymentContent).toBe('AIMS 1234');
    expect(component.loading).toBe(false);
    expect(component.errorMessage).toBeNull();
  });

  it('should load success state directly if payment is already confirmed on init', () => {
    const mockSuccessResponse = {
      status: 'SUCCESS',
      message: 'Payment confirmed',
      orderId: 'test-order-123',
      order: { totalAmount: 132000 },
      transaction: { transactionContent: 'AIMS 1234', amount: 132000 }
    };
    mockOrderService.getPaymentConfirmation = vi.fn().mockReturnValue(of(mockSuccessResponse));

    component.ngOnInit();

    expect(mockOrderService.getPaymentConfirmation).toHaveBeenCalledWith('test-order-123');
    expect(mockOrderService.requestVietQrPayment).not.toHaveBeenCalled();
    expect(component.paymentSuccess).toBe(true);
    expect(component.amount).toBe(132000);
    expect(component.paymentContent).toBe('AIMS 1234');
    expect(mockCartService.emptyCart).toHaveBeenCalled();
    expect(localStorage.getItem('aims_current_order_id')).toBeNull();
  });

  it('should poll status up to max attempts and set error state on polling timeout', () => {
    vi.useFakeTimers();

    component.ngOnInit(); // Initiates load -> requestPayment
    expect(component.confirmingPayment).toBe(false);

    // Call confirmPayment
    component.confirmPayment();
    expect(component.confirmingPayment).toBe(true);
    expect(mockOrderService.confirmVietQrPayment).toHaveBeenCalledWith('test-order-123');

    // Fast-forward time for 12 polling attempts (each delay is 500ms)
    for (let i = 0; i <= 12; i++) {
      vi.advanceTimersByTime(500);
    }

    expect(component.confirmingPayment).toBe(false);
    expect(component.errorMessage).toBe('Payment has not been confirmed yet. Please try again after VietQR sends the transaction.');

    vi.useRealTimers();
  });

  it('should stop polling and clear drafts on successful payment confirmation during polling', () => {
    vi.useFakeTimers();

    // Mock initial check: PENDING
    mockOrderService.getPaymentConfirmation = vi.fn().mockReturnValue(of({
      status: 'PENDING_CONFIRMATION',
      message: 'No transaction yet'
    }));

    component.ngOnInit();

    // Start confirmation
    component.confirmPayment();
    expect(component.confirmingPayment).toBe(true);

    // Mock successful status on the 3rd poll
    vi.advanceTimersByTime(500); // Poll 1: pending
    vi.advanceTimersByTime(500); // Poll 2: pending

    const mockSuccessResponse = {
      status: 'SUCCESS',
      message: 'Payment confirmed',
      orderId: 'test-order-123',
      order: { totalAmount: 132000 },
      transaction: { transactionContent: 'AIMS 1234', amount: 132000 }
    };
    mockOrderService.getPaymentConfirmation = vi.fn().mockReturnValue(of(mockSuccessResponse));

    vi.advanceTimersByTime(500); // Poll 3: success

    expect(component.paymentSuccess).toBe(true);
    expect(component.confirmingPayment).toBe(false);
    expect(mockCartService.emptyCart).toHaveBeenCalled();
    expect(localStorage.getItem('aims_current_order_id')).toBeNull();

    vi.useRealTimers();
  });
});
