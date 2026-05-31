import { Body, Controller, Post, ValidationPipe, Get, Param } from '@nestjs/common';
import { OrderService } from './order.service.js';
import {
  CalculateShippingDto,
  PlaceOrderDto,
} from './dto/calculate-shipping.dto.js';

/**
 * PlaceOrderController — Boundary class (BCE pattern) for the backend.
 * Exposes REST endpoints for shipping fee calculation and order placement.
 */
@Controller('api/orders')
export class PlaceOrderController {
  constructor(private readonly orderService: OrderService) { }

  /**
   * POST /api/orders/calculate-shipping
   * AC-2: Calculates shipping fee dynamically based on province and cart items.
   * Returns a full breakdown: baseFee, additionalFee, discount, shippingFee,
   * subtotal, VAT, and totalAmount.
   */
  @Post('calculate-shipping')
  calculateShipping(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CalculateShippingDto,
  ) {
    return this.orderService.calculateShippingFee(dto.province, dto.cartItems);
  }

  /**
   * POST /api/orders/place
   * AC-1 & AC-3: Place an order with delivery info and cart items.
   * Returns the full invoice data for display.
   */
  @Post('place')
  placeOrder(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: PlaceOrderDto,
  ) {
    // Calculate the invoice breakdown
    const invoice = this.orderService.calculateShippingFee(
      dto.province,
      dto.cartItems,
    );

    return {
      deliveryInfo: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email || null,
        province: dto.province,
        address: dto.address,
        note: dto.note || null,
      },
      cartItems: dto.cartItems,
      ...invoice,
    };
  }

  /**
   * GET /api/orders/:orderId/status
   * Get the current status of an order (for polling).
   */
  @Get(':orderId/status')
  async getOrderStatus(@Param('orderId') orderId: string) {
    const order = await this.orderService.getOrder(orderId);
    return { status: order.status };
  }
}
