import { Product } from './product.model';

export class CartItem {
  product: Product;
  quantity: number;

  constructor(product: Product, quantity: number) {
    this.product = product;
    this.quantity = quantity;
  }

  getSubtotal(): number {
    return this.product.currentPrice * this.quantity;
  }

  getWeight(): number {
    return (this.product.weight || 0) * this.quantity;
  }
}

export class Cart {
  items: CartItem[] = [];

  constructor(items: CartItem[] = []) {
    this.items = items;
  }

  calculateSubTotal(): number {
    return this.items.reduce((total, item) => total + item.getSubtotal(), 0);
  }

  getTotalWeight(): number {
    return this.items.reduce((total, item) => total + item.getWeight(), 0);
  }

  emptyCart(): void {
    this.items = [];
  }

  addItem(product: Product, quantity: number): void {
    if (quantity <= 0) return;
    const existingItem = this.getItem(product.productId);
    if (existingItem) {
      this.updateQuantity(product.productId, existingItem.quantity + quantity);
    } else {
      const allowedQuantity = Math.min(quantity, product.stockQuantity);
      this.items.push(new CartItem(product, allowedQuantity));
    }
  }

  removeItem(productId: string): void {
    this.items = this.items.filter(item => item.product.productId !== productId);
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    const item = this.getItem(productId);
    if (item) {
      item.quantity = Math.min(quantity, item.product.stockQuantity);
    }
  }

  getItem(productId: string): CartItem | undefined {
    return this.items.find(item => item.product.productId === productId);
  }
}
