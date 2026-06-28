import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentTransaction } from '../payment/entities/payment-transaction.entity.js';

export type PayPalRefundStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

export interface PayPalRefundResult {
  status: PayPalRefundStatus;
  gatewayRefundId?: string;
  message?: string;
}

@Injectable()
export class PayPalRefundBoundary {
  private readonly logger = new Logger(PayPalRefundBoundary.name);

  constructor(private readonly configService: ConfigService) {}

  async refundPayment(
    paymentTransaction: PaymentTransaction,
  ): Promise<PayPalRefundResult> {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET');
    const baseUrl =
      this.configService.get<string>('PAYPAL_API_BASE_URL') ||
      'https://api-m.sandbox.paypal.com';
    const captureId = this.resolveCaptureId(paymentTransaction);

    if (!clientId || !clientSecret || !captureId) {
      return {
        status: 'FAILED',
        message:
          'PayPal refund is not configured or the payment transaction has no capture id.',
      };
    }

    try {
      const token = await this.fetchAccessToken(
        baseUrl,
        clientId,
        clientSecret,
      );
      const response = await fetch(
        `${baseUrl}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: {
              value: Number(paymentTransaction.amount).toFixed(2),
              currency_code:
                paymentTransaction.paymentDetails?.currency || 'USD',
            },
          }),
        },
      );
      const body = (await response.json().catch(() => ({}))) as {
        id?: string;
        status?: string;
        message?: string;
      };

      if (!response.ok) {
        return {
          status: 'FAILED',
          gatewayRefundId: body.id,
          message:
            body.message || `PayPal refund failed with ${response.status}`,
        };
      }

      return {
        status: this.mapPayPalStatus(body.status),
        gatewayRefundId: body.id,
        message: body.status,
      };
    } catch (error: any) {
      this.logger.error(
        `PayPal refund failed for transaction ${paymentTransaction.paymentTransactionId}: ${error.message}`,
      );
      return { status: 'FAILED', message: error.message };
    }
  }

  private async fetchAccessToken(
    baseUrl: string,
    clientId: string,
    clientSecret: string,
  ): Promise<string> {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const body = (await response.json()) as { access_token?: string };
    if (!response.ok || !body.access_token) {
      throw new Error(`PayPal authentication failed with ${response.status}`);
    }
    return body.access_token;
  }

  private resolveCaptureId(paymentTransaction: PaymentTransaction): string {
    return (
      paymentTransaction.paymentDetails?.captureId ||
      paymentTransaction.paymentDetails?.capture_id ||
      paymentTransaction.paymentDetails?.capture?.id ||
      paymentTransaction.transactionRef ||
      ''
    );
  }

  private mapPayPalStatus(status?: string): PayPalRefundStatus {
    if (status === 'COMPLETED') {
      return 'SUCCESS';
    }
    if (status === 'PENDING') {
      return 'PENDING';
    }
    return 'FAILED';
  }
}
