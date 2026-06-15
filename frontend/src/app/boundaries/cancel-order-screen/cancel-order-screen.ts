import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-cancel-order-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancel-order-screen.html',
  styleUrl: './cancel-order-screen.css',
})
export class CancelOrderScreen implements OnInit {
  cancelToken: string | null = null;
  reason: string = '';
  loading = false;
  error: string | null = null;
  successData: any = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly orderService: OrderService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cancelToken = this.route.snapshot.paramMap.get('cancelToken');
    if (!this.cancelToken) {
      this.error = 'Invalid cancel token';
    }
  }

  cancelOrder() {
    if (!this.cancelToken) return;

    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.orderService.cancelCustomerOrder(this.cancelToken, this.reason).subscribe({
      next: (data) => {
        this.successData = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to cancel the order. It may have already been processed or the link is invalid.';
        this.loading = false;
        console.error(err);
        this.cdr.detectChanges();
      },
    });
  }
}
