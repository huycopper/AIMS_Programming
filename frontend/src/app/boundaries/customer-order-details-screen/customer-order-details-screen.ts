import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../services/order.service';
import { InvoiceData } from '../../models/order.model';

@Component({
  selector: 'app-customer-order-details-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customer-order-details-screen.html',
  styleUrl: './customer-order-details-screen.css',
})
export class CustomerOrderDetailsScreen implements OnInit {
  orderData: any = null;
  loading = true;
  error: string | null = null;
  cancelToken: string | null = null; // Might not have it from view API, but can link to cancel if available or show button

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly orderService: OrderService,
  ) {}

  ngOnInit(): void {
    const viewToken = this.route.snapshot.paramMap.get('viewToken');
    if (!viewToken) {
      this.error = 'Invalid view token';
      this.loading = false;
      return;
    }

    this.orderService.getCustomerOrderByToken(viewToken).subscribe({
      next: (data) => {
        this.orderData = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load order details. The link may be expired or invalid.';
        this.loading = false;
        console.error(err);
      },
    });
  }
}
