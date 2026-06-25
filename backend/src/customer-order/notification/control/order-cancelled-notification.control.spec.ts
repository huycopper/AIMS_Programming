import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrderCancelledNotificationControl } from './order-cancelled-notification.control.js';
import { OrderCancelledEmailTemplateControl } from './order-cancelled-email-template.control.js';
import { EmailBoundary } from '../../../pay-order/notification/boundary/email/email.boundary.js';
import { Order } from '../../../order/entities/order.entity.js';
import { RefundTransaction } from '../../../refund/entities/refund-transaction.entity.js';

describe('OrderCancelledNotificationControl', () => {
  let control: OrderCancelledNotificationControl;
  let configServiceMock: jest.Mocked<ConfigService>;
  let emailBoundaryMock: jest.Mocked<EmailBoundary>;

  beforeEach(async () => {
    configServiceMock = {
      get: jest.fn().mockReturnValue('http://localhost:4200'),
    } as any;

    emailBoundaryMock = {
      sendEmail: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderCancelledNotificationControl,
        OrderCancelledEmailTemplateControl,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: EmailBoundary, useValue: emailBoundaryMock },
      ],
    }).compile();

    control = module.get<OrderCancelledNotificationControl>(
      OrderCancelledNotificationControl,
    );
  });

  function createOrder(email?: string): Order {
    return {
      orderId: 'ord-123',
      orderViewToken: 'view-token-123',
      totalAmount: 120000,
      deliveryInfo: {
        name: 'Customer',
        email,
      },
    } as unknown as Order;
  }

  function createRefund(
    refundStatus: RefundTransaction['refundStatus'],
  ): RefundTransaction {
    return {
      refundAmount: 120000,
      refundStatus,
      refundMethod: 'MANUAL_BANK_TRANSFER',
    } as RefundTransaction;
  }

  it('should log and skip email delivery if delivery email is missing', async () => {
    await control.sendOrderCancelledNotification(
      createOrder(),
      createRefund('MANUAL_REQUIRED'),
    );

    expect(emailBoundaryMock.sendEmail).not.toHaveBeenCalled();
  });

  it('should send a manual VietQR refund cancellation email', async () => {
    await control.sendOrderCancelledNotification(
      createOrder('customer@example.com'),
      createRefund('MANUAL_REQUIRED'),
    );

    expect(emailBoundaryMock.sendEmail).toHaveBeenCalledTimes(1);
    const [message] = emailBoundaryMock.sendEmail.mock.calls[0];

    expect(message.to).toBe('customer@example.com');
    expect(message.subject).toContain('Order #ord-123');
    expect(message.text).toContain('Your order #ord-123');
    expect(message.text).toContain(
      'http://localhost:4200/orders/view/view-token-123',
    );
    expect(message.text).toContain('manual bank transfer');
    expect(message.html).toContain('manual bank transfer');
  });

  it('should send a non-manual refund cancellation email with processing wording', async () => {
    await control.sendOrderCancelledNotification(
      createOrder('customer@example.com'),
      createRefund('SUCCESS'),
    );

    expect(emailBoundaryMock.sendEmail).toHaveBeenCalledTimes(1);
    const [message] = emailBoundaryMock.sendEmail.mock.calls[0];

    expect(message.text).toContain('is being processed');
    expect(message.html).toContain('is being processed');
    expect(message.text).not.toContain('manual bank transfer');
  });

  it('should reject if the email boundary rejects', async () => {
    emailBoundaryMock.sendEmail.mockRejectedValue(new Error('SMTP failure'));

    await expect(
      control.sendOrderCancelledNotification(
        createOrder('customer@example.com'),
        createRefund('MANUAL_REQUIRED'),
      ),
    ).rejects.toThrow('SMTP failure');
  });
});
