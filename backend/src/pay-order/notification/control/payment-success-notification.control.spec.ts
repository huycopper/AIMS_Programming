import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentSuccessNotificationControl } from './payment-success-notification.control.js';
import { EmailBoundary } from '../boundary/email/email.boundary.js';
import { PaymentSuccessEmailTemplateControl } from './payment-success-email-template.control.js';
import { Order } from '../../../order/entities/order.entity.js';
import { PaymentTransaction } from '../../../payment/entities/payment-transaction.entity.js';
import { EmailMessage } from '../entity/email-message.model.js';

describe('PaymentSuccessNotificationControl', () => {
  let control: PaymentSuccessNotificationControl;
  let configServiceMock: jest.Mocked<ConfigService>;
  let emailBoundaryMock: jest.Mocked<EmailBoundary>;
  let templateControlMock: jest.Mocked<PaymentSuccessEmailTemplateControl>;

  beforeEach(async () => {
    configServiceMock = {
      get: jest.fn().mockReturnValue('http://localhost:4200'),
    } as any;

    emailBoundaryMock = {
      sendEmail: jest.fn(),
    };

    templateControlMock = {
      buildMessage: jest
        .fn()
        .mockReturnValue(
          new EmailMessage('to@example.com', 'subject', 'html', 'text'),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentSuccessNotificationControl,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: EmailBoundary, useValue: emailBoundaryMock },
        {
          provide: PaymentSuccessEmailTemplateControl,
          useValue: templateControlMock,
        },
      ],
    }).compile();

    control = module.get<PaymentSuccessNotificationControl>(
      PaymentSuccessNotificationControl,
    );
  });

  it('should return success and log warning if delivery email is missing', async () => {
    const order = {
      orderId: 'ord-123',
      deliveryInfo: { name: 'Customer' },
    } as unknown as Order;

    const transaction = {} as PaymentTransaction;

    const result = await control.sendPaymentSuccessNotification(
      order,
      transaction,
    );

    expect(result.success).toBe(true);
    expect(result.sentAt).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(emailBoundaryMock.sendEmail).not.toHaveBeenCalled();
  });

  it('should return success if email is sent successfully', async () => {
    const order = {
      orderId: 'ord-123',
      deliveryInfo: { name: 'Customer', email: 'to@example.com' },
    } as unknown as Order;

    const transaction = {} as PaymentTransaction;

    emailBoundaryMock.sendEmail.mockResolvedValue(undefined);

    const result = await control.sendPaymentSuccessNotification(
      order,
      transaction,
    );

    expect(result.success).toBe(true);
    expect(result.sentAt).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(emailBoundaryMock.sendEmail).toHaveBeenCalled();
  });

  it('should return failure if email boundary throws error', async () => {
    const order = {
      orderId: 'ord-123',
      deliveryInfo: { name: 'Customer', email: 'to@example.com' },
    } as unknown as Order;

    const transaction = {} as PaymentTransaction;

    emailBoundaryMock.sendEmail.mockRejectedValue(new Error('SMTP Error'));

    const result = await control.sendPaymentSuccessNotification(
      order,
      transaction,
    );

    expect(result.success).toBe(false);
    expect(result.sentAt).toBeUndefined();
    expect(result.error).toBe('SMTP Error');
    expect(emailBoundaryMock.sendEmail).toHaveBeenCalled();
  });
});
