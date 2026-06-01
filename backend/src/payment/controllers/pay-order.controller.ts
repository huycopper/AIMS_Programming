//file này dùng để hứng request từ frontend, tìm order và gọi generateQRCode của PayThroughPaymentGatewayController
import { Controller, Post, Body, Logger, Param, BadRequestException } from '@nestjs/common';
import { PayThroughPaymentGatewayController } from '../services/pay-through-payment-gateway.service.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from '../../order/entities/order.entity.js';
import { Repository } from 'typeorm';

@Controller('api/payment/pay-order')
export class PayOrderController {
  private readonly logger = new Logger(PayOrderController.name);

  constructor(
    private readonly paymentGatewayController: PayThroughPaymentGatewayController,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) { }

  //hàm này dùng để trả về QR code cho frontend
  @Post(':orderId')
  async payOrder(@Param('orderId') orderId: string) {
    this.logger.log(`Received PayOrder request for invoice: ${orderId}`);

    // Fetch order/invoice
    const invoice = await this.orderRepo.findOne({ where: { orderId } }); // Tìm order theo ID
    if (!invoice) {
      throw new BadRequestException('Order not found'); // Nếu không tìm thấy order thì ném ra lỗi
    }

    // Call generateQRCode on PayThroughPaymentGatewayController
    const qrResult = await this.paymentGatewayController.generateQRCode(invoice);

    // Return QR code to frontend for display
    return qrResult;
  }
}
