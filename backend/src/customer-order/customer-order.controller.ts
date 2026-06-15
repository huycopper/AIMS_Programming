import { Controller, Get, Post, Param, Body, ValidationPipe } from '@nestjs/common';
import { CustomerOrderService } from './customer-order.service.js';
import { CancelOrderDto } from './dto/cancel-order.dto.js';

@Controller('api/customer/orders')
export class CustomerOrderController {
  constructor(private readonly customerOrderService: CustomerOrderService) {}

  @Get('view/:viewToken')
  async getOrderByViewToken(@Param('viewToken') viewToken: string) {
    return this.customerOrderService.getOrderByViewToken(viewToken);
  }

  @Post('cancel/:cancelToken')
  async cancelOrderByToken(
    @Param('cancelToken') cancelToken: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CancelOrderDto,
  ) {
    return this.customerOrderService.cancelOrderByToken(cancelToken, dto.reason);
  }
}
