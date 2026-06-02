import { Injectable, Logger } from '@nestjs/common';
import { Order } from '../../order/entities/order.entity.js';

@Injectable()
export class VietQRBoundary {
  private readonly logger = new Logger(VietQRBoundary.name);

  // VietQR Sandbox API configuration
  // Theo tài liệu: POST https://dev.vietqr.org/vqr/api/token_generate
  private readonly VIETQR_TOKEN_URL = 'https://dev.vietqr.org/vqr/api/token_generate';
  private readonly VIETQR_USERNAME = 'customer-aims888-user26593';
  private readonly VIETQR_PASSWORD = 'Y3VzdG9tZXItYWltczg4OC11c2VyMjY1OTM=';

  // Gọi API VietQR để lấy access token
  async getAccessToken(): Promise<string> {
    this.logger.log('Calling VietQR API to get access token...');

    // Build Basic Auth header: Base64(username:password)
    // Tài liệu VietQR yêu cầu gửi request kèm mật khẩu dưới dạng Basic Base64[username:password]. 
    // Đoạn code này nối Username và Password bằng dấu hai chấm :
    // Sau đó, dùng Buffer.from(...).toString('base64') (một hàm có sẵn của Node.js) để biến chuỗi chữ thường đó thành một chuỗi mã hóa khó đọc (Base64).
    const credentials = `${this.VIETQR_USERNAME}:${this.VIETQR_PASSWORD}`;
    const base64Credentials = Buffer.from(credentials).toString('base64');

    // Gửi request qua mạng
    const response = await fetch(this.VIETQR_TOKEN_URL, { // Sử dụng hàm fetch để gọi một HTTP Request tới máy chủ VietQR.
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${base64Credentials}`,
      },
    });
    // response là một object chứa các thông tin VietQR trả về như status, headers, body, ok...
    // response.ok là true nếu request thành công (status từ 200-299)
    // response.status là mã trạng thái của request
    // response.body là nội dung của response
    // response.headers là các headers của response

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`VietQR GetToken failed: ${response.status} - ${errorBody}`);
      throw new Error(`Failed to get VietQR access token: ${response.status}`);
    }

    // Trích xuất token VietQR trả về
    const data: any = await response.json();
    this.logger.log(`VietQR access token obtained successfully (expires in ${data.expires_in}s)`);
    // console.log("\n\nResponse from VietQR: ", response);
    // console.log("\n\nResponse from VietQR json: ", data);
    return data.access_token;
  }

  // VietQR Generate QR Code API configuration
  // Theo tài liệu: POST https://dev.vietqr.org/vqr/api/qr/generate-customer
  private readonly VIETQR_GENERATE_URL = 'https://dev.vietqr.org/vqr/api/qr/generate-customer';
  private readonly BANK_CODE = 'MB';
  private readonly BANK_ACCOUNT = '999990977777';
  private readonly USER_BANK_NAME = 'DONG DAI HUY';

  // Gọi API VietQR để sinh mã QR thanh toán
  async generateQRCode(order: Order, accessToken: string): Promise<{ qrDataURL: string }> {
    this.logger.log(`Calling VietQR API to generate QR for order ${order.orderId}`);

    // orderId tối đa 13 ký tự (yêu cầu của VietQR), cắt bớt UUID
    const shortOrderId = order.orderId.replace(/-/g, '').substring(0, 13);

    // content tối đa 23 ký tự, không dấu, không ký tự đặc biệt
    const content = `AIMS ${shortOrderId}`;

    // Body gửi đi theo tài liệu VietQR (QR Động: qrType = 0)
    const body = {
      bankCode: this.BANK_CODE,
      bankAccount: this.BANK_ACCOUNT,
      userBankName: this.USER_BANK_NAME,
      content: content,
      qrType: 0,
      amount: Math.round(order.totalAmount),
      orderId: shortOrderId
    };

    this.logger.log(`VietQR request body: ${JSON.stringify(body)}`);

    // Gửi request tới VietQR API với Bearer token nhận được từ getAccessToken()
    const response = await fetch(this.VIETQR_GENERATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`VietQR GenerateQR failed: ${response.status} - ${errorBody}`);
      throw new Error(`Failed to generate VietQR code: ${response.status}`);
    }

    const data: any = await response.json();
    this.logger.log(`VietQR QR code generated successfully. qrLink: ${data.qrLink}`);

    // Trả về qrLink (URL ảnh mã QR) để Frontend hiển thị trong thẻ <img>
    return { qrDataURL: data.qrLink };
  }
}
