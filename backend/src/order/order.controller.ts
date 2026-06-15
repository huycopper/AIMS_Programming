import { Body, Controller, Get, NotFoundException, Param, Post, ValidationPipe, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderService } from './order.service.js';
import {
  CalculateShippingDto,
  PlaceOrderDto,
} from './dto/calculate-shipping.dto.js';
import { Order, OrderItem, DeliveryInfo } from './entities/order.entity.js';

/**
 * PlaceOrderController — Boundary class (BCE pattern) for the backend.
 * Exposes REST endpoints for shipping fee calculation and order placement.
 */
@Controller('api/orders')
export class PlaceOrderController {
  private readonly logger = new Logger(PlaceOrderController.name);

  constructor(
    private readonly orderService: OrderService,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(DeliveryInfo)
    private readonly deliveryInfoRepo: Repository<DeliveryInfo>,
  ) { }

  /**
   * POST /api/orders/calculate-shipping
   * AC-2: Calculates shipping fee dynamically based on province and cart items.
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
   * Saves Order, DeliveryInfo, and OrderItems to DB.
   * Returns the full invoice data including orderId for payment flow.
   */
  @Post('place')
  async placeOrder(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: PlaceOrderDto,
  ) {
    // Calculate the invoice breakdown
    const invoice = this.orderService.calculateShippingFee(
      dto.province,
      dto.cartItems,
    );

    // 1. Create and save DeliveryInfo
    const deliveryInfo = this.deliveryInfoRepo.create({
      name: dto.name,
      phone: dto.phone,
      email: dto.email || '',
      province: dto.province,
      address: dto.address,
      note: dto.note || null,
    });

    // 2. Build OrderItems from cart
    const orderItems: Partial<OrderItem>[] = dto.cartItems.map(item => ({
      productId: item.productId,
      productTitle: item.productTitle || item.productId,
      quantity: item.quantity,
      unitPrice: item.currentPrice,
      weight: item.weight,
    }));

    // 3. Create Order with relations
    const order = this.orderRepo.create({
      deliveryInfo: deliveryInfo,
      subtotal: invoice.subtotal,
      vat: invoice.vat,
      shippingFee: invoice.shippingFee,
      totalAmount: invoice.totalAmount,
      totalWeight: invoice.totalWeight,
      status: 'PENDING', // Trạng thái ban đầu khi đặt hàng
      orderViewToken: randomUUID(),
      cancelToken: randomUUID(),
      items: orderItems as OrderItem[],
    });

    // 4. Save (cascade saves DeliveryInfo + OrderItems)
    const savedOrder = await this.orderRepo.save(order);
    this.logger.log(`Order created with ID: ${savedOrder.orderId}`);

    return {
      orderId: savedOrder.orderId,
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

  @Get(':orderId')
  async getOrder(@Param('orderId') orderId: string) {
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.buildInvoiceResponse(order);
  }

  private buildInvoiceResponse(order: Order) {
    const cartItems = (order.items || []).map((item) => ({
      productId: item.productId,
      productTitle: item.productTitle,
      quantity: Number(item.quantity),
      weight: Number(item.weight),
      currentPrice: Number(item.unitPrice),
    }));
    const invoice = this.orderService.calculateShippingFee(order.deliveryInfo.province, cartItems);

    return {
      orderId: order.orderId,
      deliveryInfo: {
        name: order.deliveryInfo.name,
        phone: order.deliveryInfo.phone,
        email: order.deliveryInfo.email || '',
        province: order.deliveryInfo.province,
        address: order.deliveryInfo.address,
        note: order.deliveryInfo.note || undefined,
      },
      cartItems,
      ...invoice,
      totalWeight: Number(order.totalWeight),
      subtotal: Number(order.subtotal),
      vat: Number(order.vat),
      shippingFee: Number(order.shippingFee),
      totalAmount: Number(order.totalAmount),
    };
  }
}
