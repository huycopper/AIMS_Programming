import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction } from '../../../payment/entities/payment-transaction.entity.js';
import { Order } from '../../../order/entities/order.entity.js';
import { TransactionCallbackDto } from '../entity/vietqr-transaction-sync.dto.js';

@Injectable()
export class VietQrPaymentTransactionFactory {
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
  ) {}

  createPaymentTransaction(
    order: Order,
    body: TransactionCallbackDto,
    transactionRef: string,
    refTransactionId: string,
  ): PaymentTransaction {
    return this.paymentTransactionRepo.create({
      order,
      transactionRef,
      amount: Number(body.amount),
      paymentMethod: 'VIETQR',
      status: 'SUCCESS',
      paymentDetails: {
        transactionid: body.transactionid,
        transactiontime: body.transactiontime,
        referencenumber: body.referencenumber,
        bankaccount: this.getCallbackBankAccount(body),
        content: body.content,
        transType: body.transType,
        orderId: body.orderId,
        terminalCode: body.terminalCode,
        subTerminalCode: body.subTerminalCode,
        serviceCode: body.serviceCode,
        urlLink: body.urlLink,
        sign: body.sign,
        reftransactionid: refTransactionId,
      },
    });
  }

  private getCallbackBankAccount(transactionSyncBody: TransactionCallbackDto): string {
    return transactionSyncBody.bankaccount ?? transactionSyncBody.bankAccount ?? '';
  }
}
