import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { InvoiceData } from '../../models/order.model';

@Component({
  selector: 'app-successful-screen',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './successful-screen.html',
  styleUrl: './successful-screen.css',
})
export class SuccessfulScreen implements OnInit {
  orderId: number | null = null;
  invoiceData: InvoiceData | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    const state = history.state;
    if (state && state['orderId']) {
      this.orderId = state['orderId'];
      this.invoiceData = state['invoiceData'] || null;
    }
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
