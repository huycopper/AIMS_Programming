import { Test, TestingModule } from '@nestjs/testing';
import { AdminNotificationControl } from './admin-notification.control.js';
import { EmailBoundary } from '../../pay-order/notification/boundary/email/email.boundary.js';
import { EmailMessage } from '../../pay-order/notification/entity/email-message.model.js';

describe('AdminNotificationControl', () => {
  let control: AdminNotificationControl;
  let emailBoundary: jest.Mocked<EmailBoundary>;

  beforeEach(async () => {
    emailBoundary = {
      sendEmail: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminNotificationControl,
        {
          provide: EmailBoundary,
          useValue: emailBoundary,
        },
      ],
    }).compile();

    control = module.get<AdminNotificationControl>(AdminNotificationControl);
  });

  it('should send account created email', async () => {
    emailBoundary.sendEmail.mockResolvedValue(undefined);

    const result = await control.sendAccountCreated('user@aims.com', 'user', 'http://setup-link');

    expect(result).toBe(true);
    expect(emailBoundary.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@aims.com',
        subject: 'Your AIMS Staff Account Has Been Created',
      }),
    );
  });

  it('should send roles changed email', async () => {
    emailBoundary.sendEmail.mockResolvedValue(undefined);

    const result = await control.sendRolesChanged('user@aims.com', 'user', ['ADMIN'], ['ADMIN', 'PRODUCT_MANAGER']);

    expect(result).toBe(true);
    expect(emailBoundary.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@aims.com',
        subject: 'Your AIMS Staff Roles Have Been Updated',
      }),
    );
  });

  it('should send status changed email', async () => {
    emailBoundary.sendEmail.mockResolvedValue(undefined);

    const result = await control.sendStatusChanged('user@aims.com', 'user', 'BLOCKED', 'violating policies');

    expect(result).toBe(true);
    expect(emailBoundary.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@aims.com',
        subject: 'Your AIMS Staff Account Status: BLOCKED',
      }),
    );
  });

  it('should send password reset triggered email', async () => {
    emailBoundary.sendEmail.mockResolvedValue(undefined);

    const result = await control.sendPasswordResetTriggered('user@aims.com', 'user', 'http://reset-link');

    expect(result).toBe(true);
    expect(emailBoundary.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@aims.com',
        subject: 'AIMS Password Reset Request',
      }),
    );
  });

  it('should return false if sending email throws an error', async () => {
    emailBoundary.sendEmail.mockRejectedValue(new Error('SMTP error'));

    const result = await control.sendAccountCreated('user@aims.com', 'user', 'http://setup-link');

    expect(result).toBe(false);
  });
});
