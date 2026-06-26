import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { Cart } from '../../models/cart.model';
import { CartItemPayload, ShippingFeeResult } from '../../models/order.model';
import { TopBarComponent } from '../../shared/top-bar/top-bar';

/**
 * DeliveryInfoScreen — Boundary component (BCE pattern).
 * Allows the customer to enter delivery information (Name, Phone, Email, Province, Address, Note).
 * Dynamically recalculates shipping fee when province/address changes.
 */
@Component({
  selector: 'app-delivery-info-screen',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TopBarComponent],
  templateUrl: './delivery-info-screen.html',
  styleUrl: './delivery-info-screen.css',
})
export class DeliveryInfoScreen implements OnInit, OnDestroy {
  // Form fields
  name = '';
  phone = '';
  email = '';
  province = '';
  address = '';
  note = '';

  // Cart data
  cart: Cart | null = null;

  // Shipping result
  shippingResult: ShippingFeeResult | null = null;
  isCalculatingShipping = false;
  isSubmitting = false;
  errorMessage = '';

  // Active shipping calculation subscription
  private shippingSub?: Subscription;

  // Form validation errors
  validationErrors: { [key: string]: string } = {};

  // Province change subject for debounced API calls
  private provinceChange$ = new Subject<string>();
  private subscriptions: Subscription[] = [];
  private readonly deliveryDraftKey = 'aims_delivery_draft';
  private readonly currentInvoiceKey = 'aims_current_invoice';
  private readonly currentOrderIdKey = 'aims_current_order_id';

  // Vietnamese provinces list
  readonly provinces: string[] = [
    'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
    'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
    'Bình Thuận', 'Cà Mau', 'Cần Thơ', 'Cao Bằng', 'Đà Nẵng',
    'Đắk Lắk', 'Đắk Nông', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp',
    'Gia Lai', 'Hà Giang', 'Hà Nam', 'Hà Nội', 'Hà Tĩnh',
    'Hải Dương', 'Hải Phòng', 'Hậu Giang', 'Hồ Chí Minh', 'Hòa Bình',
    'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
    'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định',
    'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên',
    'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị',
    'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên',
    'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang',
    'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái',
  ];

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit(): void {
    this.loadDeliveryDraft();

    // Subscribe to cart state
    const cartSub = this.cartService.getCartObservable().subscribe((cart) => {
      this.cart = cart;
      if (!cart || cart.items.length === 0) {
        this.router.navigate(['/cart']);
      } else {
        if (this.province && this.address) {
          this.recalculateShipping();
        }
      }
      this.cdr?.markForCheck();
    });
    this.subscriptions.push(cartSub);

    // Debounced shipping calculation on province change
    const provinceSub = this.provinceChange$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.recalculateShipping();
      });
    this.subscriptions.push(provinceSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Called when province or address changes — triggers shipping recalculation.
   */
  onProvinceOrAddressChange(): void {
    if (this.province && this.address) {
      this.provinceChange$.next(`${this.province}-${this.address}`);
    }
  }

  onDeliveryFieldChange(field: string, shouldRecalculate = false): void {
    this.validationErrors[field] = '';
    this.saveDeliveryDraft();

    if (shouldRecalculate) {
      this.onProvinceOrAddressChange();
    }
  }

  /**
   * Build cart items payload for the backend API.
   */
  private buildCartPayload(): CartItemPayload[] {
    if (!this.cart) return [];
    return this.cart.items.map((item) => ({
      productId: item.product.productId,
      productTitle: item.product.title,
      quantity: Number(item.quantity),
      weight: Number(item.product.weight) || 0,
      currentPrice: Number(item.product.currentPrice) || 0,
    }));
  }

  /**
   * Call backend to recalculate shipping fee.
   */
  private recalculateShipping(): void {
    if (!this.province || !this.address || !this.cart) // If province or address or cart is null, return
      return;

    this.isCalculatingShipping = true;
    this.errorMessage = '';

    if (this.shippingSub) {
      this.shippingSub.unsubscribe();
    }

    const cartPayload = this.buildCartPayload(); // Build cart payload

    this.shippingSub = this.orderService
      .calculateShipping(this.province, this.address, cartPayload) // Call backend to recalculate shipping fee
      .subscribe({
        next: (result) => { // If successful
          this.shippingResult = result;
          this.isCalculatingShipping = false;
          this.cdr?.markForCheck();
        },
        error: (err) => {
          this.errorMessage = 'Failed to calculate shipping fee. Please try again.';
          this.isCalculatingShipping = false;
          this.cdr?.markForCheck();
          console.error('Shipping calculation error:', err);
        },
      });
  }

  /**
   * Validate the form fields.
   */
  validateForm(): boolean {
    this.validationErrors = {};

    if (!this.name?.trim()) {
      this.validationErrors['name'] = 'Name is required';
    }

    if (!this.phone?.trim()) {
      this.validationErrors['phone'] = 'Phone number is required';
    } else if (!/^(\+84|0)\d{9,10}$/.test(this.phone.trim())) {
      this.validationErrors['phone'] = 'Invalid Vietnamese phone number format';
    }

    if (!this.email?.trim()) {
      this.validationErrors['email'] = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      this.validationErrors['email'] = 'Invalid email format';
    }

    if (!this.province) {
      this.validationErrors['province'] = 'Province is required';
    }

    if (!this.address?.trim()) {
      this.validationErrors['address'] = 'Address is required';
    }

    return Object.keys(this.validationErrors).length === 0;
  }

  /**
   * Submit delivery info and navigate to the invoice screen.
   */
  submitDeliveryInfo(): void {
    if (!this.validateForm()) return;
    if (!this.cart || this.cart.items.length === 0) return;

    this.isSubmitting = true;
    this.errorMessage = '';

    const deliveryInfo = {
      name: this.name?.trim() || '',
      phone: this.phone?.trim() || '',
      email: this.email?.trim() || '',
      province: this.province,
      address: this.address?.trim() || '',
      note: this.note?.trim() || undefined,
    };

    const cartPayload = this.buildCartPayload();

    this.orderService.placeOrder(deliveryInfo, cartPayload).subscribe({
      next: (invoiceData) => {
        this.isSubmitting = false;
        this.saveCurrentInvoice(invoiceData);
        this.cdr?.markForCheck();
        // Navigate to invoice screen with invoice data
        this.router.navigate(['/invoice'], {
          state: { invoiceData, cart: this.cart },
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          'Failed to place order. Please check your information and try again.';
        this.cdr?.markForCheck();
        console.error('Place order error:', err);
      },
    });
  }

  /**
   * Navigate back to the cart screen.
   */
  goBack(): void {
    this.router.navigate(['/cart']);
  }

  /**
   * Format price to VND currency string
   */
  formatPrice(price: any): string {
    const numPrice = Number(price);
    if (isNaN(numPrice)) {
      return price + '₫';
    }
    return numPrice.toLocaleString('vi-VN') + '₫';
  }

  /**
   * Calculate total quantity of items in cart
   */
  getTotalQuantity(): number {
    if (!this.cart) return 0;
    return this.cart.items.reduce((total, item) => total + Number(item.quantity), 0);
  }

  private saveDeliveryDraft(): void {
    if (typeof localStorage === 'undefined') return;

    localStorage.setItem(this.deliveryDraftKey, JSON.stringify({
      name: this.name,
      phone: this.phone,
      email: this.email,
      province: this.province,
      address: this.address,
      note: this.note,
    }));
  }

  private loadDeliveryDraft(): void {
    if (typeof localStorage === 'undefined') return;

    const savedDraft = localStorage.getItem(this.deliveryDraftKey);
    if (!savedDraft) return;

    try {
      const draft = JSON.parse(savedDraft);
      this.name = draft.name || '';
      this.phone = draft.phone || '';
      this.email = draft.email || '';
      this.province = draft.province || '';
      this.address = draft.address || '';
      this.note = draft.note || '';
    } catch {
      localStorage.removeItem(this.deliveryDraftKey);
    }
  }

  private saveCurrentInvoice(invoiceData: any): void {
    if (typeof localStorage === 'undefined') return;

    localStorage.setItem(this.currentInvoiceKey, JSON.stringify(invoiceData));
    if (invoiceData?.orderId) {
      localStorage.setItem(this.currentOrderIdKey, invoiceData.orderId);
    }
  }
}
