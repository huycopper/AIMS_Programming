import { Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Order } from '../../order/entities/order.entity.js';
import * as QRCode from 'qrcode';

@Injectable()
export class VietQRBoundary {
  private readonly logger = new Logger(VietQRBoundary.name);

  constructor(private readonly jwtService: JwtService) { }

  private readonly VIETQR_TOKEN_URL = process.env.VIETQR_TOKEN_URL!;
  private readonly VIETQR_GENERATE_URL = process.env.VIETQR_GENERATE_URL!;
  private readonly VIETQR_TEST_CALLBACK_URL = process.env.VIETQR_TEST_CALLBACK_URL!;
  private readonly VIETQR_USERNAME = process.env.VIETQR_USERNAME!;
  private readonly VIETQR_PASSWORD = process.env.VIETQR_PASSWORD!;
  private readonly BANK_CODE = process.env.BANK_CODE!;
  private readonly BANK_ACCOUNT = process.env.BANK_ACCOUNT!;
  private readonly USER_BANK_NAME = process.env.USER_BANK_NAME!;

  // Gọi API VietQR để lấy access token
  async getAccessToken(): Promise<string> {
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

    this.logger.log(`VietQR access token obtained successfully (expires in ${data.expires_in}s)`);
    return data.access_token;
  }

  // Gọi API VietQR để sinh mã QR thanh toán
  async generateQRCode(order: Order, accessToken: string): Promise<{ qrDataURL: string; amount: number; content: string }> {
    this.logger.log(`Calling VietQR API to generate QR for order ${order.orderId}`);

    const shortOrderId = this.getShortOrderId(order);
    const amount = this.getPaymentAmount(order);
    const content = this.getPaymentContent(shortOrderId);

    // Body gửi đi theo tài liệu VietQR 
    const body = {
      bankCode: this.BANK_CODE,
      bankAccount: this.BANK_ACCOUNT,
      userBankName: this.USER_BANK_NAME,
      content,
      qrType: 0, // qrType = 0: QR Động
      amount,
      orderId: shortOrderId,
      transType: 'C',
    };

    this.logger.log(`VietQR request body: ${JSON.stringify(body)}`);

    // Gửi request tới VietQR API với Bearer token nhận được từ getAccessToken()
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

    this.logger.log(`VietQR QR code generated successfully. qrLink: ${data.qrLink}`);

    const qrDataURL = await QRCode.toDataURL(data.qrCode); // Chuyển QR thành URL

    return { qrDataURL, amount, content };
  }

  /**
   * Gọi API Test Callback của VietQR Sandbox để giả lập giao dịch thanh toán thành công.
   * Theo tài liệu 5-CallAPITestCallback.md:
   *   - URL: POST https://dev.vietqr.org/vqr/bank/api/test/transaction-callback
   *   - Headers: Authorization: Bearer <token từ VietQR>
   *   - Body: { bankAccount, content, amount, transType, bankCode }
   *
   * Sau khi VietQR nhận request này, VietQR sẽ tự động gọi API Transaction Sync
   * (postAPIToAIMS) tới endpoint vqr/bank/api/transaction-sync trên hệ thống AIMS
   * để thông báo giao dịch đã hoàn thành.
   *
   * @param order - Đơn hàng cần xác nhận thanh toán
   * @param accessToken - Token VietQR đã lấy được từ getAccessToken()
   * @returns Kết quả từ VietQR Test Callback API { status, message }
   */
  async postAPICallback(order: Order, accessToken: string): Promise<{ status: string; message: string }> {
    this.logger.log(`Calling VietQR Test Callback API for order ${order.orderId}`);

    const shortOrderId = this.getShortOrderId(order);
    const content = this.getPaymentContent(shortOrderId);

    // Body theo tài liệu 5-CallAPITestCallback.md
    const body = {
      bankAccount: this.BANK_ACCOUNT,
      content,
      amount: this.getPaymentAmount(order),
      transType: 'C', // Phân loại giao dịch là ghi nợ/ghi có (giá trị: D/C). Mặc định là 'C'.
      bankCode: this.BANK_CODE,
    };

    this.logger.log(`VietQR Test Callback request body: ${JSON.stringify(body)}`);

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

    this.logger.log(`VietQR Test Callback response: ${JSON.stringify(data)}`);

    if (data.status === undefined || data.message === undefined) {
      this.logger.error(`VietQR Test Callback response missing status or message: ${JSON.stringify(data)}`);
      throw new Error('VietQR Test Callback response missing status or message');
    }

    return { status: data.status, message: data.message };
  }

  /**
   * Hàm này để hứng request từ VietQR khi VietQR POST API generate_token để lấy token của client
   * @param username - Username của client
   * @param password - Password của client
   * @returns JWT token của client
   */
  generateJWTToken(username: string, password: string) {
    this.logger.log(`Generating JWT token for client username: ${username}`);

    if (
      username === process.env.CLIENT_USERNAME &&
      password === process.env.CLIENT_PASSWORD
    ) {
      if (!process.env.JWT_SECRET) {
        this.logger.error('JWT_SECRET is not configured');
        throw new InternalServerErrorException({
          status: 'FAILED',
          message: 'JWT_SECRET is not configured',
        });
      }

      const JWT_token = this.jwtService.sign(
        { username },
        {
          secret: process.env.JWT_SECRET,
          algorithm: 'HS512',
          expiresIn: '5m', // Token hết hạn sau 5 phút
        },
      );

      this.logger.log('JWT token generated successfully');

      return {
        access_token: JWT_token,
        token_type: 'Bearer',
        expires_in: 300,
      };
    } else {
      this.logger.warn(`Invalid credentials provided for username: ${username}`);
      throw new UnauthorizedException({
        status: 'FAILED',
        message: 'INVALID_CREDENTIALS',
      });
    }
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
