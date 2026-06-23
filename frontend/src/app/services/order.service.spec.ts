// @vitest-environment jsdom

import '@angular/compiler';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderService } from './order.service';

describe('OrderService admin order APIs', () => {
  let httpClient: any;
  let service: OrderService;

  beforeEach(() => {
    httpClient = {
      get: vi.fn().mockReturnValue(of({})),
      post: vi.fn().mockReturnValue(of({})),
    };
    service = new OrderService(httpClient, {} as any);
  });

  it('calls pending order list endpoint with pagination params', () => {
    service.getPendingOrders(2, 30).subscribe();

    expect(httpClient.get).toHaveBeenCalledWith(
      'http://localhost:8080/api/admin/orders/pending',
      expect.objectContaining({ params: expect.anything() }),
    );
  });

  it('calls admin order detail endpoint', () => {
    service.getAdminOrderDetail('order-1').subscribe();

    expect(httpClient.get).toHaveBeenCalledWith('http://localhost:8080/api/admin/orders/order-1');
  });

  it('calls approve endpoint with empty body', () => {
    service.approveAdminOrder('order-1').subscribe();

    expect(httpClient.post).toHaveBeenCalledWith(
      'http://localhost:8080/api/admin/orders/order-1/approve',
      {},
    );
  });

  it('calls reject endpoint with reason', () => {
    service.rejectAdminOrder('order-1', 'Out of stock').subscribe();

    expect(httpClient.post).toHaveBeenCalledWith(
      'http://localhost:8080/api/admin/orders/order-1/reject',
      { reason: 'Out of stock' },
    );
  });
});
