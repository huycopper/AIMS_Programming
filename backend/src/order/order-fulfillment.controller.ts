import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/control/jwt-auth.guard.js';
import { RolesGuard } from '../auth/control/roles.guard.js';
import { Roles } from '../auth/control/roles.decorator.js';
import { OrderFulfillmentService } from './order-fulfillment.service.js';
import { QueryPendingOrdersDto } from './dto/query-pending-orders.dto.js';
import { RejectOrderDto } from './dto/reject-order.dto.js';

@Controller('api/admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PRODUCT_MANAGER')
export class OrderFulfillmentController {
  constructor(private readonly fulfillmentService: OrderFulfillmentService) {}

  @Get('pending')
  listPendingOrders(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    dto: QueryPendingOrdersDto,
  ) {
    return this.fulfillmentService.listPendingOrders(dto);
  }

  @Get(':orderId')
  getPendingOrderDetail(@Param('orderId') orderId: string) {
    return this.fulfillmentService.getPendingOrderDetail(orderId);
  }

  @Post(':orderId/approve')
  approveOrder(@Param('orderId') orderId: string, @Req() req: any) {
    return this.fulfillmentService.approveOrder(orderId, req.user.userId);
  }

  @Post(':orderId/reject')
  rejectOrder(
    @Param('orderId') orderId: string,
    @Req() req: any,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: RejectOrderDto,
  ) {
    return this.fulfillmentService.rejectOrder(
      orderId,
      dto.reason,
      req.user.userId,
    );
  }
}
