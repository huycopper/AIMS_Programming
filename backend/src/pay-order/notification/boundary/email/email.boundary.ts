import { EmailMessage } from '../../entity/email-message.model.js';

export abstract class EmailBoundary {
  abstract sendEmail(message: EmailMessage): Promise<void>;
}
