import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailBoundary } from './email.boundary.js';
import { EmailMessage } from '../../entity/email-message.model.js';

@Injectable()
export class NodemailerEmailBoundary implements EmailBoundary {
  private readonly logger = new Logger(NodemailerEmailBoundary.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'localhost'),
      port: this.configService.get<number>('SMTP_PORT', 1025),
      secure: this.configService.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.configService.get<string>('SMTP_USER', ''),
        pass: this.configService.get<string>('SMTP_PASS', ''),
      },
    });
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    const isEnabledStr = this.configService.get<string>('EMAIL_ENABLED');
    const isEnabled = isEnabledStr === 'true'; // Default to false if not explicitly true

    if (!isEnabled) {
      this.logger.log(`[EMAIL_ENABLED=false] Simulated email to ${message.to}: ${message.subject}`);
      return;
    }

    try {
      const from = this.configService.get<string>('SMTP_FROM', '"AIMS Store" <no-reply@aims.com>');
      const info = await this.transporter.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      this.logger.log(`Email sent successfully to ${message.to}. Message ID: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${message.to}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
