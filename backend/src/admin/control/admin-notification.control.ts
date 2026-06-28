import { Injectable, Logger } from '@nestjs/common';
import { EmailBoundary } from '../../pay-order/notification/boundary/email/email.boundary.js';
import { EmailMessage } from '../../pay-order/notification/entity/email-message.model.js';

@Injectable()
export class AdminNotificationControl {
  private readonly logger = new Logger(AdminNotificationControl.name);

  constructor(private readonly emailBoundary: EmailBoundary) {}

  async sendAccountCreated(
    email: string,
    username: string,
    setupLink: string,
  ): Promise<boolean> {
    const subject = 'Your AIMS Staff Account Has Been Created';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4f46e5;">Welcome to AIMS!</h2>
        <p>Hello <strong>${username}</strong>,</p>
        <p>Your staff account has been created by the system administrator.</p>
        <p>Please use the link below to set up your password and access your account. This link will expire shortly.</p>
        <div style="margin: 24px 0;">
          <a href="${setupLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Set Up Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #4f46e5; font-size: 14px;">${setupLink}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">This is an automated security notification from AIMS Store.</p>
      </div>
    `;
    const text = `Hello ${username},\n\nYour staff account has been created. Please set up your password by visiting: ${setupLink}`;

    return await this.sendSafeEmail(email, subject, html, text);
  }

  async sendRolesChanged(
    email: string,
    username: string,
    oldRoles: string[],
    newRoles: string[],
  ): Promise<boolean> {
    const subject = 'Your AIMS Staff Roles Have Been Updated';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #e11d48;">Security Notice: Role Modification</h2>
        <p>Hello <strong>${username}</strong>,</p>
        <p>An administrator has modified the roles assigned to your account.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f3f4f6;">Previous Roles</th>
            <td style="border: 1px solid #ddd; padding: 8px;">${oldRoles.join(', ') || 'None'}</td>
          </tr>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f3f4f6;">New Assigned Roles</th>
            <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; color: #4f46e5;">${newRoles.join(', ') || 'None'}</td>
          </tr>
        </table>
        <p>If you did not request or expect this change, please contact your security administrator immediately.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">This is an automated security notification from AIMS Store.</p>
      </div>
    `;
    const text = `Hello ${username},\n\nYour AIMS staff roles have been updated.\nPrevious: ${oldRoles.join(', ')}\nNew: ${newRoles.join(', ')}`;

    return await this.sendSafeEmail(email, subject, html, text);
  }

  async sendStatusChanged(
    email: string,
    username: string,
    status: string,
    reason?: string | null,
  ): Promise<boolean> {
    const subject = `Your AIMS Staff Account Status: ${status}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #dc2626;">Security Notice: Account Status Update</h2>
        <p>Hello <strong>${username}</strong>,</p>
        <p>Your staff account status has been changed to <strong style="color: #dc2626;">${status}</strong>.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>If your account is blocked or deactivated, you will not be able to log in or access staff functions.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">This is an automated security notification from AIMS Store.</p>
      </div>
    `;
    const text = `Hello ${username},\n\nYour account status has been updated to ${status}.${reason ? `\nReason: ${reason}` : ''}`;

    return await this.sendSafeEmail(email, subject, html, text);
  }

  async sendPasswordResetTriggered(
    email: string,
    username: string,
    resetLink: string,
  ): Promise<boolean> {
    const subject = 'AIMS Password Reset Request';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Hello <strong>${username}</strong>,</p>
        <p>A password reset has been triggered for your account by an administrator.</p>
        <p>Please use the button below to choose a new password. This link is valid for a limited time and can only be used once.</p>
        <div style="margin: 24px 0;">
          <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #2563eb; font-size: 14px;">${resetLink}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">This is an automated security notification from AIMS Store.</p>
      </div>
    `;
    const text = `Hello ${username},\n\nA password reset request has been triggered. Reset your password here: ${resetLink}`;

    return await this.sendSafeEmail(email, subject, html, text);
  }

  private async sendSafeEmail(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<boolean> {
    try {
      const msg = new EmailMessage(to, subject, html, text);
      await this.emailBoundary.sendEmail(msg);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`, err.stack);
      return false;
    }
  }
}
