//file này dùng để hứng request từ frontend, tìm order và gọi generateQRCode / confirmPayment của PayThroughPaymentGatewayController
import { Controller, Post, Body, Logger, Param, BadRequestException } from '@nestjs/common';
import { PayThroughPaymentGatewayController } from '../services/pay-through-payment-gateway.service.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from '../../order/entities/order.entity.js';
import { Repository } from 'typeorm';

@Controller('api/payment/pay-order')
export class PayOrderController {
  private readonly logger = new Logger(PayOrderController.name);

  constructor(
    private readonly payThroughPaymentGatewayController: PayThroughPaymentGatewayController,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) { }

  /**
   * Bước 1 trong Sequence Diagram v2: payOrder(order)
   * 
   * Customer → PayOrderController: payOrder(order)
   * PayOrderController → PayThroughPaymentGatewayController: generateQRCode(order)
   * → VietQRBoundary: getAccessToken() + generateQRCode(invoice, accessToken)
   * → PaymentScreen: displayQRCode(order, qrCode)
   */
  @Post(':orderId') // endpoint để hứng request từ frontend
  async payOrder(@Param('orderId') orderId: string) {
    this.logger.log(`Received PayOrder request for invoice: ${orderId}`);

    // Fetch order/invoice
    const invoice = await this.orderRepo.findOne({ where: { orderId } }); // Tìm order theo ID
    if (!invoice) {
      throw new BadRequestException('Order not found'); // Nếu không tìm thấy order thì ném ra lỗi
    }

    // Call generateQRCode on PayThroughPaymentGatewayController
    const qrResult = await this.payThroughPaymentGatewayController.generateQRCode(invoice);

    // Return QR code to frontend for display
    return qrResult;
  }

  /**
   * Bước 2 trong Sequence Diagram v2: confirmPayment()
   * 
   * Luồng hoạt động:
   * 1. Customer bấm "I have paid" (confirmPayment) trên PaymentScreen
   * 2. Frontend gọi POST /api/payment/pay-order/:orderId/confirm
   * 3. PayOrderController gọi confirmPayment(order) trên PayThroughPaymentGatewayController
   * 4. PayThroughPaymentGatewayController gọi handleAPICallback(order) → VietQRBoundary
   * 5. VietQRBoundary gọi API Test Callback (postAPICallback) → VietQR Sandbox
   * 6. VietQR Sandbox tự động gọi Transaction Sync (postAPIToAIMS) → AIMS Backend
   * 7. TransactionSyncController nhận callback → lưu PaymentTransaction + update order status
   * 8. Kết quả trả về cho Frontend → hiển thị SuccessfulPaidScreen
   * 
   * @param orderId - ID đơn hàng cần xác nhận thanh toán
   * @returns paymentResult - { status, message, orderId }
   */
  @Post(':orderId/confirm')
  async confirmPayment(@Param('orderId') orderId: string) {
    this.logger.log(`Received confirmPayment request for order: ${orderId}`);

    // Tìm order theo ID
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // Gọi confirmPayment trên PayThroughPaymentGatewayController (bước 2.1 trong SD v2)
    const paymentResult = await this.payThroughPaymentGatewayController.confirmPayment(order);

    this.logger.log(`Payment result for order ${orderId}: ${JSON.stringify(paymentResult)}`);

    // returnPaymentResult() - trả kết quả về cho Frontend
    return paymentResult;
  }
}
