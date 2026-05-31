import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaceOrderController } from './order.controller.js';
import { OrderService } from './order.service.js';
import { Order, OrderItem, DeliveryInfo } from './entities/order.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, DeliveryInfo])],
  controllers: [PlaceOrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule { }
