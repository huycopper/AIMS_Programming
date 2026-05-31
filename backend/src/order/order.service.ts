import { Injectable } from '@nestjs/common';
import { CartItemDto } from './dto/calculate-shipping.dto.js';

/**
 * OrderService — Control class (BCE pattern).
 * Orchestrates order-related business logic including shipping fee calculation.
 *
 * Shipping fee rules (from Problem Statement FR6):
 * - Hanoi/HCM: Base fee = 22,000 VND for the first 3 kg
 * - Other provinces: Base fee = 30,000 VND for the first 0.5 kg
 * - Additional fee: 2,500 VND for every subsequent 0.5 kg
 * - Discount: Up to 25,000 VND if cart subtotal > 100,000 VND
 */
@Injectable()
export class OrderService {
  /**
   * Provinces classified as "inner city" — Hanoi and HCM.
   * Matching is case-insensitive and trimmed.
   */
  private readonly INNER_CITY_PROVINCES = [
    'Hà Nội',
    'Hồ Chí Minh',
  ];

  /**
   * Determine if the given province is inner-city (Hanoi or HCM).
   */
  isInnerCity(province: string): boolean {
    return this.INNER_CITY_PROVINCES.includes(province);
  }

  /**
   * Calculate the total weight from cart items (each item weight * quantity).
   * Rounds to 2 decimal places to prevent floating point precision issues.
   */
  calculateTotalWeight(cartItems: CartItemDto[]): number {
    const rawWeight = cartItems.reduce(
      (total, item) => total + item.weight * item.quantity,
      0,
    );
    // Làm tròn đến 2 chữ số thập phân (ví dụ 10.350000000000001 -> 10.35)
    return Math.round(rawWeight * 100) / 100;
  }

  /**
   * Calculate cart subtotal (sum of currentPrice * quantity for each item).
   */
  calculateSubtotal(cartItems: CartItemDto[]): number {
    return cartItems.reduce(
      (total, item) => total + item.currentPrice * item.quantity,
      0,
    );
  }

  /**
   * Core shipping fee calculation.
   *
   * @param province - The delivery province
   * @param cartItems - Array of cart items with weight and price info
   * @returns Object with breakdown: baseFee, additionalFee, grossShipping, discount, shippingFee
   */
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
      // Hanoi/HCM: Base fee 22,000 VND for first 3 kg
      baseFee = 22000;
      const excessWeight = Math.max(0, totalWeight - 3);
      // Additional 2,500 VND for every subsequent 0.5 kg
      const halfKgUnits = Math.ceil(excessWeight / 0.5);
      additionalFee = halfKgUnits * 2500;
    } else {
      // Other provinces: Base fee 30,000 VND for first 0.5 kg
      baseFee = 30000;
      const excessWeight = Math.max(0, totalWeight - 0.5);
      // Additional 2,500 VND for every subsequent 0.5 kg
      const halfKgUnits = Math.ceil(excessWeight / 0.5);
      additionalFee = halfKgUnits * 2500;
    }

    const grossShipping = baseFee + additionalFee;

    // Discount: up to 25,000 VND if subtotal > 100,000 VND
    let discount = 0;
    if (subtotal > 100000) {
      discount = Math.min(25000, grossShipping);
    }

    const shippingFee = grossShipping - discount;

    // 10% VAT on product subtotal
    const vat = Math.round(subtotal * 0.1);

    // Total amount = subtotal + VAT + shipping fee
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
}
