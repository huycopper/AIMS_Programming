export class PaymentSuccessNotificationResult {
  constructor(
    public readonly success: boolean,
    public readonly sentAt?: Date,
    public readonly error?: string,
  ) {}

  static success(sentAt: Date = new Date()): PaymentSuccessNotificationResult {
    return new PaymentSuccessNotificationResult(true, sentAt, undefined);
  }

  static failure(errorMessage: string): PaymentSuccessNotificationResult {
    return new PaymentSuccessNotificationResult(false, undefined, errorMessage);
  }
}
