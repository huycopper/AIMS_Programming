// @vitest-environment jsdom

import '@angular/compiler';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderManagementScreen } from './order-management-screen';
import { AdminOrderDetail, PendingOrderRow } from '../../models/order.model';

describe('OrderManagementScreen', () => {
  let component: OrderManagementScreen;
  let orderService: any;
  let cdr: any;

  beforeEach(() => {
    orderService = {
      getPendingOrders: vi.fn().mockReturnValue(
        of({
          data: [pendingOrder],
          total: 1,
          page: 1,
          limit: 30,
        }),
      ),
      getAdminOrderDetail: vi.fn().mockReturnValue(of(orderDetail)),
      approveAdminOrder: vi.fn().mockReturnValue(of({ ...orderDetail, status: 'APPROVED' })),
      rejectAdminOrder: vi.fn().mockReturnValue(of({ ...orderDetail, status: 'REJECTED' })),
    };
    cdr = { markForCheck: vi.fn() };
    component = new OrderManagementScreen(orderService, cdr);
  });

  it('loads pending orders with 30 per page', () => {
    component.loadOrders();

    expect(orderService.getPendingOrders).toHaveBeenCalledWith(1, 30);
    expect(component.orders).toEqual([pendingOrder]);
  });

  it('loads detail when a row is selected', () => {
    component.selectOrder(pendingOrder);

    expect(orderService.getAdminOrderDetail).toHaveBeenCalledWith('order-1');
    expect(component.selectedOrder?.orderId).toBe('order-1');
  });

  it('requires a non-empty rejection reason before calling API', () => {
    component.selectedOrder = orderDetail;
    component.rejectReason = '   ';

    component.submitReject();

    expect(component.errorMessage).toContain('required');
    expect(orderService.rejectAdminOrder).not.toHaveBeenCalled();
  });

  it('disables duplicate approve submissions while a request is in flight', () => {
    component.selectedOrder = orderDetail;
    component.isSubmitting = true;

    component.submitApprove();

    expect(orderService.approveAdminOrder).not.toHaveBeenCalled();
  });

  it('surfaces stock conflict details from backend errors', () => {
    orderService.approveAdminOrder.mockReturnValue(
      throwError(() => ({
        error: {
          conflicts: [{ productId: 'p1', title: 'Book', requested: 2, available: 1 }],
        },
      })),
    );
    component.selectedOrder = orderDetail;

    component.submitApprove();

    expect(component.errorMessage).toContain('Book: requested 2, available 1');
  });

  const pendingOrder: PendingOrderRow = {
    orderId: 'order-1',
    status: 'PENDING_PROCESSING',
    createdAt: '2026-06-23T00:00:00.000Z',
    customerName: 'Nguyen Van A',
    customerEmail: 'a@example.com',
    customerPhone: '0123456789',
    province: 'Ha Noi',
    address: '1 A Street',
    itemCount: 2,
    totalAmount: 132000,
    payment: {
      paymentTransactionId: 'payment-1',
      paymentMethod: 'VIETQR',
      status: 'SUCCESS',
      transactionRef: 'ref-1',
      amount: 132000,
      createdAt: '2026-06-23T00:00:00.000Z',
    },
    refund: null,
  };

  const orderDetail: AdminOrderDetail = {
    ...pendingOrder,
    deliveryInfo: {
      name: 'Nguyen Van A',
      phone: '0123456789',
      email: 'a@example.com',
      province: 'Ha Noi',
      address: '1 A Street',
    },
    items: [
      {
        orderItemId: 'item-1',
        productId: 'p1',
        productTitle: 'Book',
        quantity: 2,
        unitPrice: 50000,
        weight: 1,
        lineTotal: 100000,
        currentProduct: {
          productId: 'p1',
          title: 'Book',
          stockQuantity: 5,
          status: 'ACTIVE',
        },
      },
    ],
    invoice: {
      subtotal: 100000,
      vat: 10000,
      shippingFee: 22000,
      totalAmount: 132000,
      totalWeight: 2,
    },
    canApprove: true,
    canReject: true,
    stockConflicts: [],
  };
});
