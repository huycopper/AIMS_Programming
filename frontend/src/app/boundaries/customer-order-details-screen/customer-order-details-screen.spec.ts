// @vitest-environment jsdom
import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomerOrderDetailsScreen } from './customer-order-details-screen';

describe('CustomerOrderDetailsScreen', () => {
  let component: CustomerOrderDetailsScreen;
  let mockActivatedRoute: any;
  let mockRouter: any;
  let mockOrderService: any;
  let mockCdr: any;

  beforeEach(() => {
    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue('view-token-123')
        }
      }
    };
    mockRouter = {
      navigate: vi.fn()
    };
    mockOrderService = {
      getCustomerOrderByToken: vi.fn().mockReturnValue({
        subscribe: vi.fn()
      })
    };
    mockCdr = {
      detectChanges: vi.fn()
    };

    component = new CustomerOrderDetailsScreen(
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

