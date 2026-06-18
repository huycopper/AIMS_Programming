// @vitest-environment jsdom
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { VietQRPaymentScreen } from './vietqr-payment-screen.component';
import { of, throwError, Subject } from 'rxjs';

describe('VietQRPaymentScreen (unit)', () => {
  let component: VietQRPaymentScreen;
  let mockActivatedRoute: any;
  let mockRouter: any;
  let mockVietQrPaymentControl: any;
  let mockVietQrPaymentStorageControl: any;
  let mockSanitizer: any;
  let mockCdr: any;
  let mockLocation: any;

  beforeEach(() => {
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

    mockVietQrPaymentControl = {
      requestPayment: vi.fn().mockReturnValue(of({
        qrDataURL: 'data:image/png;base64,fake-qr-data',
        amount: 132000,
        content: 'AIMS 1234'
      })),
      confirmPayment: vi.fn().mockReturnValue(of({
        status: 'PENDING_CONFIRMATION',
        message: 'Waiting for sync'
      })),
      checkPaymentState: vi.fn().mockReturnValue(of({
        status: 'PENDING_CONFIRMATION',
        message: 'No transaction yet'
      })),
      pollConfirmation: vi.fn().mockReturnValue(new Subject()),
      isConfirmed: vi.fn().mockImplementation((res) => res.status === 'SUCCESS')
    };

    mockVietQrPaymentStorageControl = {
      loadCurrentOrderId: vi.fn().mockReturnValue(''),
      saveCurrentOrderId: vi.fn(),
      clearOrderingDrafts: vi.fn()
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
      mockVietQrPaymentControl,
      mockVietQrPaymentStorageControl,
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
    mockVietQrPaymentStorageControl.loadCurrentOrderId = vi.fn().mockReturnValue(null);
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

    expect(mockVietQrPaymentControl.checkPaymentState).toHaveBeenCalledWith('test-order-123');
    expect(mockVietQrPaymentControl.requestPayment).toHaveBeenCalledWith('test-order-123');
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
    mockVietQrPaymentControl.checkPaymentState = vi.fn().mockReturnValue(of(mockSuccessResponse));
    mockVietQrPaymentControl.isConfirmed = vi.fn().mockReturnValue(true);

    component.ngOnInit();

    expect(mockVietQrPaymentControl.checkPaymentState).toHaveBeenCalledWith('test-order-123');
    expect(mockVietQrPaymentControl.requestPayment).not.toHaveBeenCalled();
    expect(component.paymentSuccess).toBe(true);
    expect(component.amount).toBe(132000);
    expect(component.paymentContent).toBe('AIMS 1234');
  });

  it('should poll status on confirmPayment if not immediately confirmed', () => {
    component.ngOnInit(); // Initiates load -> requestPayment

    // Call confirmPayment
    component.confirmPayment();
    expect(component.confirmingPayment).toBe(true);
    expect(mockVietQrPaymentControl.confirmPayment).toHaveBeenCalledWith('test-order-123');
    expect(mockVietQrPaymentControl.pollConfirmation).toHaveBeenCalledWith('test-order-123');
  });

  it('should handle successful payment confirmation during polling', () => {
    const mockSuccessResponse = {
      status: 'SUCCESS',
      message: 'Payment confirmed',
      orderId: 'test-order-123',
      order: { totalAmount: 132000 },
      transaction: { transactionContent: 'AIMS 1234', amount: 132000 }
    };
    mockVietQrPaymentControl.pollConfirmation = vi.fn().mockReturnValue(of(mockSuccessResponse));

    component.ngOnInit();
    component.confirmPayment();

    expect(component.paymentSuccess).toBe(true);
    expect(component.confirmingPayment).toBe(false);
    expect(component.amount).toBe(132000);
    expect(component.paymentContent).toBe('AIMS 1234');
  });

  it('should handle polling timeout', () => {
    mockVietQrPaymentControl.pollConfirmation = vi.fn().mockReturnValue(throwError(() => new Error('TIMEOUT')));

    component.ngOnInit();
    component.confirmPayment();

    expect(component.paymentSuccess).toBe(false);
    expect(component.confirmingPayment).toBe(false);
    expect(component.errorMessage).toBe('Payment has not been confirmed yet. Please try again after VietQR sends the transaction.');
  });
});
