import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { Order } from '../../order/entities/order.entity.js';

export interface VietQRGenerationResult {
  qrDataURL: string;
  amount: number;
  content: string;
  orderId: string;
}

@Injectable()
export class VietQRBoundary {
  private readonly logger = new Logger(VietQRBoundary.name);

  private readonly VIETQR_TOKEN_URL = process.env.VIETQR_TOKEN_URL!;
  private readonly VIETQR_GENERATE_URL = process.env.VIETQR_GENERATE_URL!;
  private readonly VIETQR_TEST_CALLBACK_URL = process.env.VIETQR_TEST_CALLBACK_URL!;
  private readonly VIETQR_USERNAME = process.env.VIETQR_USERNAME!;
  private readonly VIETQR_PASSWORD = process.env.VIETQR_PASSWORD!;
  private readonly BANK_CODE = process.env.BANK_CODE!;
  private readonly BANK_ACCOUNT = process.env.BANK_ACCOUNT!;
  private readonly USER_BANK_NAME = process.env.USER_BANK_NAME!;

  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.accessTokenExpiresAt) {
      return this.accessToken;
    }

    this.logger.log('Calling VietQR API to get access token...');

    const credentials = `${this.VIETQR_USERNAME}:${this.VIETQR_PASSWORD}`;
    const base64Credentials = Buffer.from(credentials).toString('base64');

    const response = await fetch(this.VIETQR_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${base64Credentials}`,
      },
    });
    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`VietQR GetToken failed: ${response.status} - ${errorBody}`);
      throw new Error(`Failed to get VietQR access token: ${response.status}`);
    }

    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) {
      this.logger.error(`VietQR GetToken response missing access_token: ${JSON.stringify(data)}`);
      throw new Error('VietQR GetToken response missing access_token');
    }

    const expiresInSeconds = data.expires_in ?? 300;
    this.accessToken = data.access_token;
    this.accessTokenExpiresAt = now + Math.max(expiresInSeconds - 30, 1) * 1000;

    this.logger.log(`VietQR access token obtained successfully (expires in ${expiresInSeconds}s)`);
    return this.accessToken;
  }

  async generateQRCode(order: Order): Promise<VietQRGenerationResult> {
    this.logger.log(`Calling VietQR API to generate QR for order ${order.orderId}`);

    const accessToken = await this.getAccessToken();
    const shortOrderId = this.getShortOrderId(order);
    const amount = this.getPaymentAmount(order);
    const content = this.getPaymentContent(shortOrderId);
    const body = {
      bankCode: this.BANK_CODE,
      bankAccount: this.BANK_ACCOUNT,
      userBankName: this.USER_BANK_NAME,
      content,
      qrType: 0,
      amount,
      orderId: shortOrderId,
      transType: 'C',
    };

    const response = await fetch(this.VIETQR_GENERATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`VietQR GenerateQR failed: ${response.status} - ${errorBody}`);
      throw new Error(`Failed to generate VietQR code: ${response.status}`);
    }

    const data = (await response.json()) as {
      qrCode?: string;
      qrLink?: string;
    };

    if (!data.qrCode) {
      this.logger.error(`VietQR GenerateQR response missing qrCode: ${JSON.stringify(data)}`);
      throw new Error('VietQR GenerateQR response missing qrCode');
    }

    const qrDataURL = await QRCode.toDataURL(data.qrCode);

    return { qrDataURL, amount, content, orderId: shortOrderId };
  }

  async handleAPICallback(order: Order): Promise<{ status: string; message: string }> {
    this.logger.log(`Calling VietQR Test Callback API for order ${order.orderId}`);

    const accessToken = await this.getAccessToken();
    const shortOrderId = this.getShortOrderId(order);
    const body = {
      bankAccount: this.BANK_ACCOUNT,
      content: this.getPaymentContent(shortOrderId),
      amount: this.getPaymentAmount(order),
      transType: 'C',
      bankCode: this.BANK_CODE,
    };

    const response = await fetch(this.VIETQR_TEST_CALLBACK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`VietQR Test Callback failed: ${response.status} - ${errorBody}`);
      throw new Error(`Failed to call VietQR Test Callback: ${response.status}`);
    }

    const data = (await response.json()) as {
      status?: string;
      message?: string;
    };

    if (data.status === undefined || data.message === undefined) {
      this.logger.error(`VietQR Test Callback response missing status or message: ${JSON.stringify(data)}`);
      throw new Error('VietQR Test Callback response missing status or message');
    }

    return { status: data.status, message: data.message };
  }

  private getShortOrderId(order: Order): string {
    return order.orderId.replace(/-/g, '').substring(0, 13);
  }

  private getPaymentAmount(order: Order): number {
    return Math.round(Number(order.totalAmount));
  }

  private getPaymentContent(shortOrderId: string): string {
    return `AIMS ${shortOrderId}`;
  }
}
