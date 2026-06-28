import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { Subscription } from 'rxjs';

/**
 * TopBarComponent — Shared header/navigation bar component.
 * Reuses the same top bar design from the homepage across all customer-facing screens.
 *
 * @Input activeCart — when true, shows the cart button as "active" (highlighted) state.
 */
@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.css',
})
export class TopBarComponent implements OnInit, OnDestroy {
  /** Highlights the cart button when on the cart page */
  @Input() activeCart = false;

  /** Controls visibility of the Home navigation link */
  @Input() showHome = true;

  /** Controls visibility of the Shopping Cart button */
  @Input() showCart = true;

  cartItemCount = 0;
  private cartSub?: Subscription;

  constructor(
    private readonly cartService: CartService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cartSub = this.cartService.getCartObservable().subscribe(cart => {
      this.cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.cartSub?.unsubscribe();
  }
}
