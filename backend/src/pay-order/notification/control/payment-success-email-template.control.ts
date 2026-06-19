import { Injectable } from '@nestjs/common';
import { PaymentSuccessEmail } from '../entity/payment-success-email.model.js';
import { EmailMessage } from '../entity/email-message.model.js';

@Injectable()
export class PaymentSuccessEmailTemplateControl {
  buildMessage(emailData: PaymentSuccessEmail): EmailMessage {
    const subject = `[AIMS] Payment Successful - Order #${emailData.orderId}`;

    const text = `
Dear ${emailData.customerName},

Thank you for your purchase! Your payment of ${emailData.totalAmountFormatted} was successful.
We are now processing your order.

Order ID: ${emailData.orderId}
Payment Method: ${emailData.paymentMethod}

To view your order details or track the status, visit:
${emailData.viewOrderUrl}

If you made a mistake, you can cancel your order here (before it is approved):
${emailData.cancelOrderUrl}

Best regards,
AIMS Store Team
    `.trim();

    const html = `
    <h2>Thank you for your purchase!</h2>
    <p>Dear ${emailData.customerName},</p>
    <p>Your payment of <strong>${emailData.totalAmountFormatted}</strong> was successful. We are now processing your order.</p>
    
    <h3>Order Summary</h3>
    <ul>
      <li><strong>Order ID:</strong> ${emailData.orderId}</li>
      <li><strong>Payment Method:</strong> ${emailData.paymentMethod}</li>
    </ul>

    <p>
      <a href="${emailData.viewOrderUrl}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Order Details</a>
    </p>
    
    <p>
      <small>If you made a mistake, you can <a href="${emailData.cancelOrderUrl}">cancel your order</a> before it is approved.</small>
    </p>
    
    <p>Best regards,<br>AIMS Store Team</p>
    `.trim();

    return new EmailMessage(emailData.recipientEmail, subject, html, text);
  }
}
