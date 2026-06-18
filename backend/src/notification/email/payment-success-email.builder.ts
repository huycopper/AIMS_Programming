import { Order } from '../../order/entities/order.entity.js';
import { PaymentTransaction } from '../../payment/entities/payment-transaction.entity.js';
import { PaymentSuccessEmail } from '../../pay-order/notification/entity/payment-success-email.model.js';
import { PaymentSuccessEmailTemplateControl } from '../../pay-order/notification/control/payment-success-email-template.control.js';

export function buildPaymentSuccessEmail(
  order: Order,
  transaction: PaymentTransaction,
  appPublicUrl: string,
) {
  const emailData = new PaymentSuccessEmail(order, transaction, appPublicUrl);
  const templateControl = new PaymentSuccessEmailTemplateControl();
  const message = templateControl.buildMessage(emailData);
  return {
    subject: message.subject,
    text: message.text,
    html: message.html,
  };
}

