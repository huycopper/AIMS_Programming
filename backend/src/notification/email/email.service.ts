import { Injectable } from '@nestjs/common';
import { EmailBoundary } from '../../pay-order/notification/boundary/email/email.boundary.js';
import { EmailMessage } from '../../pay-order/notification/entity/email-message.model.js';

@Injectable()
export class EmailService {
  constructor(private readonly emailBoundary: EmailBoundary) {}

  get transporter() {
    return (this.emailBoundary as any).transporter;
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<void> {
    await this.emailBoundary.sendEmail(new EmailMessage(to, subject, html, text));
  }
}


