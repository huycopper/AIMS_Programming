import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminOrderDetail, PendingOrderRow, StockConflict } from '../../models/order.model';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-order-management-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-management-screen.html',
  styleUrl: './order-management-screen.css',
})
export class OrderManagementScreen implements OnInit {
  orders: PendingOrderRow[] = [];
  selectedOrder: AdminOrderDetail | null = null;
  page = 1;
  limit = 30;
  total = 0;
  isLoading = false;
  isDetailLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  rejectReason = '';
  isRejectDialogOpen = false;
  isApproveDialogOpen = false;

  constructor(
    private readonly orderService: OrderService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading = true;
    this.clearMessages();
    this.orderService.getPendingOrders(this.page, this.limit).subscribe({
      next: (result) => {
        this.orders = result.data;
        this.total = result.total;
        this.limit = result.limit;
        this.isLoading = false;
        if (this.orders.length === 0 && this.page > 1) {
          this.page -= 1;
          this.loadOrders();
          return;
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.errorMessage = this.readError(error);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  selectOrder(order: PendingOrderRow): void {
    this.isDetailLoading = true;
    this.clearMessages();
    this.orderService.getAdminOrderDetail(order.orderId).subscribe({
      next: (detail) => {
        this.selectedOrder = detail;
        this.isDetailLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.errorMessage = this.readError(error);
        this.isDetailLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  openApproveDialog(): void {
    if (!this.selectedOrder || !this.selectedOrder.canApprove) {
      return;
    }
    this.clearMessages();
    this.isApproveDialogOpen = true;
  }

  closeApproveDialog(): void {
    this.isApproveDialogOpen = false;
  }

  submitApprove(): void {
    if (!this.selectedOrder || this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;
    this.orderService.approveAdminOrder(this.selectedOrder.orderId).subscribe({
      next: (detail) => this.handleProcessedOrder(detail, 'Order approved.'),
      error: (error) => this.handleSubmitError(error),
    });
  }

  openRejectDialog(): void {
    if (!this.selectedOrder || !this.selectedOrder.canReject) {
      return;
    }
    this.clearMessages();
    this.rejectReason = '';
    this.isRejectDialogOpen = true;
  }

  closeRejectDialog(): void {
    this.isRejectDialogOpen = false;
  }

  submitReject(): void {
    if (!this.selectedOrder || this.isSubmitting) {
      return;
    }
    const reason = this.rejectReason.trim();
    if (!reason) {
      this.errorMessage = 'Rejection reason is required.';
      return;
    }
    this.isSubmitting = true;
    this.orderService.rejectAdminOrder(this.selectedOrder.orderId, reason).subscribe({
      next: (detail) => this.handleProcessedOrder(detail, 'Order rejected.'),
      error: (error) => this.handleSubmitError(error),
    });
  }

  nextPage(): void {
    if (this.page * this.limit >= this.total) {
      return;
    }
    this.page += 1;
    this.loadOrders();
  }

  previousPage(): void {
    if (this.page <= 1) {
      return;
    }
    this.page -= 1;
    this.loadOrders();
  }

  closeDetail(): void {
    this.selectedOrder = null;
  }

  formatPrice(value: number): string {
    return Number(value).toLocaleString('vi-VN') + ' VND';
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('vi-VN');
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  get hasStockConflicts(): boolean {
    return (this.selectedOrder?.stockConflicts.length || 0) > 0;
  }

  conflictText(conflict: StockConflict): string {
    return `${conflict.title}: requested ${conflict.requested}, available ${conflict.available}`;
  }

  private handleProcessedOrder(detail: AdminOrderDetail, message: string): void {
    this.selectedOrder = detail;
    this.successMessage = detail.notification?.error
      ? `${message} Email warning: ${detail.notification.error}`
      : message;
    this.isSubmitting = false;
    this.isApproveDialogOpen = false;
    this.isRejectDialogOpen = false;
    this.rejectReason = '';
    this.orders = this.orders.filter((order) => order.orderId !== detail.orderId);
    this.total = Math.max(0, this.total - 1);
    if (this.orders.length === 0) {
      this.loadOrders();
      return;
    }
    this.cdr.markForCheck();
  }

  private handleSubmitError(error: any): void {
    this.errorMessage = this.readError(error);
    this.isSubmitting = false;
    this.isApproveDialogOpen = false;
    this.cdr.markForCheck();
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private readError(error: any): string {
    const body = error?.error;
    const message = body?.message;
    if (Array.isArray(message)) {
      return message.join(' ');
    }
    if (body?.conflicts?.length) {
      return body.conflicts.map((conflict: StockConflict) => this.conflictText(conflict)).join(' ');
    }
    return message || 'Operation failed.';
  }
}
