// @vitest-environment jsdom
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CancelOrderScreen } from './cancel-order-screen';

describe('CancelOrderScreen', () => {
  let component: CancelOrderScreen;
  let mockActivatedRoute: any;
  let mockRouter: any;
  let mockOrderService: any;
  let mockCdr: any;

  beforeEach(() => {
    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue('cancel-token-123')
        }
      }
    };
    mockRouter = {
      navigate: vi.fn()
    };
    mockOrderService = {
      getCustomerOrderByCancelToken: vi.fn().mockReturnValue({
        subscribe: vi.fn()
      })
    };
    mockCdr = {
      detectChanges: vi.fn()
    };

    component = new CancelOrderScreen(
      mockActivatedRoute,
      mockRouter,
      mockOrderService,
      mockCdr
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

