import { Injectable } from '@nestjs/common';
import { CartItemDto } from './dto/calculate-shipping.dto.js';

@Injectable()
export class OrderService {
  private readonly INNER_CITY_PROVINCES = [
    'ha noi',
    'hanoi',
    'hÃ  ná»™i',
    'ho chi minh',
    'há»“ chÃ­ minh',
    'hcm',
    'tp hcm',
    'tp.hcm',
  ];

  isInnerCity(province: string): boolean {
    const normalizedProvince = this.normalizeProvince(province);
    return this.INNER_CITY_PROVINCES.includes(normalizedProvince);
  }

  calculateTotalWeight(cartItems: CartItemDto[]): number {
    const rawWeight = cartItems.reduce(
      (total, item) => total + item.weight * item.quantity,
      0,
    );
    return Math.round(rawWeight * 100) / 100;
  }

  calculateSubtotal(cartItems: CartItemDto[]): number {
    return cartItems.reduce(
      (total, item) => total + item.currentPrice * item.quantity,
      0,
    );
  }

  calculateShippingFee(
    province: string,
    cartItems: CartItemDto[],
  ): {
    totalWeight: number;
    isInnerCity: boolean;
    baseFee: number;
    additionalFee: number;
    grossShipping: number;
    discount: number;
    shippingFee: number;
    subtotal: number;
    vat: number;
    totalAmount: number;
  } {
    const totalWeight = this.calculateTotalWeight(cartItems);
    const subtotal = this.calculateSubtotal(cartItems);
    const innerCity = this.isInnerCity(province);

    let baseFee: number;
    let additionalFee: number;

    if (innerCity) {
      baseFee = 22000;
      const excessWeight = Math.max(0, totalWeight - 3);
      additionalFee = Math.ceil(excessWeight / 0.5) * 2500;
    } else {
      baseFee = 30000;
      const excessWeight = Math.max(0, totalWeight - 0.5);
      additionalFee = Math.ceil(excessWeight / 0.5) * 2500;
    }

    const grossShipping = baseFee + additionalFee;
    const discount = subtotal > 100000 ? Math.min(25000, grossShipping) : 0;
    const shippingFee = grossShipping - discount;
    const vat = Math.round(subtotal * 0.1);
    const totalAmount = subtotal + vat + shippingFee;

    return {
      totalWeight,
      isInnerCity: innerCity,
      baseFee,
      additionalFee,
      grossShipping,
      discount,
      shippingFee,
      subtotal,
      vat,
      totalAmount,
    };
  }

  private normalizeProvince(province: string): string {
    return province
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  }
}
