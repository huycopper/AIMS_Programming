import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../../order/entities/order.entity.js';
import { TransactionCallbackDto } from '../entity/vietqr-transaction-sync.dto.js';
import { VietQrPaymentCode } from '../entity/vietqr-payment-code.vo.js';

@Injectable()
export class VietQrOrderMatcherControl {
  private readonly logger = new Logger(VietQrOrderMatcherControl.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) { }

  //
  async matchOrder(transactionSyncBody: TransactionCallbackDto): Promise<Order | null> {
    this.logger.log(`Callback data 2: ${JSON.stringify(transactionSyncBody)}`);

    const allOrders = await this.orderRepo.find();
    return this.findMatchingOrder(transactionSyncBody, allOrders);
  }

  private findMatchingOrder(transactionSyncBody: TransactionCallbackDto, orders: Order[]): Order | null {
    const matchedOrder = orders.find((order) => { //Dùng biến order để duyệt từng phần tử trong mảng orders
      const paymentCode = VietQrPaymentCode.fromOrder(order); //tạo payment code từ order

      // kiểm tra xem payment code có khớp với callback không
      const isMatch = paymentCode.matchesCallback(
        transactionSyncBody.orderId, //order ID từ callback (là order ID vừa thanh toán)
        transactionSyncBody.content,
        order.orderId, // order ID trong database (order ID được tạo khi PlaceOrder)
      );

      if (isMatch) {
        this.logger.log(`Matched Order! Callback orderId: ${transactionSyncBody.orderId || '[Empty]'}, Database orderId: ${order.orderId}`);
      }

      return isMatch;
    });

    return matchedOrder ?? null; // nếu duyệt hết mà không tìm thấy thì trả về null
  }
}
