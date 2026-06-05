import { Injectable, Logger } from '@nestjs/common';
import { Order } from '../../order/entities/order.entity.js';
import * as QRCode from 'qrcode';

@Injectable()
export class VietQRBoundary {
  private readonly logger = new Logger(VietQRBoundary.name);

  // VietQR Sandbox API configuration
  // Theo tài liệu: POST https://dev.vietqr.org/vqr/api/token_generate
  private readonly VIETQR_TOKEN_URL = 'https://dev.vietqr.org/vqr/api/token_generate';
  private readonly VIETQR_USERNAME = 'customer-aims888-user26593';
  private readonly VIETQR_PASSWORD = 'Y3VzdG9tZXItYWltczg4OC11c2VyMjY1OTM=';

  // VietQR Generate QR Code API configuration
  // Theo tài liệu: POST https://dev.vietqr.org/vqr/api/qr/generate-customer
  private readonly VIETQR_GENERATE_URL = 'https://dev.vietqr.org/vqr/api/qr/generate-customer';
  private readonly BANK_CODE = 'MB';
  private readonly BANK_ACCOUNT = '999990977777';
  private readonly USER_BANK_NAME = 'DONG DAI HUY';

  // VietQR Test Callback API (Sandbox only)
  // Theo tài liệu 5-CallAPITestCallback.md: POST https://dev.vietqr.org/vqr/bank/api/test/transaction-callback
  private readonly VIETQR_TEST_CALLBACK_URL = 'https://dev.vietqr.org/vqr/bank/api/test/transaction-callback';

  // Gọi API VietQR để lấy access token
  async getAccessToken(): Promise<string> {
    this.logger.log('Calling VietQR API to get access token...');

    const credentials = `${this.VIETQR_USERNAME}:${this.VIETQR_PASSWORD}`; // chứa username và password của VietQR cấp
    const base64Credentials = Buffer.from(credentials).toString('base64');  // biến chuỗi chữ thường đó thành một chuỗi mã hóa khó đọc (Base64) để POST tới VietQR

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

    // console.log("\n\nResponse from VietQR json: ", data);

    return data.access_token;
  }

  // Gọi API VietQR để sinh mã QR thanh toán
  async generateQRCode(order: Order, accessToken: string): Promise<{ qrDataURL: string, amount: number, content: string }> {
    this.logger.log(`Calling VietQR API to generate QR for order ${order.orderId}`);

    // orderId tối đa 13 ký tự (yêu cầu của VietQR), cắt bớt UUID, xóa kí tự '-'
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
      body: JSON.stringify(body), // HTTP Request chỉ biết truyền tải text hoặc byte nên phải stringify body trước khi gửi
    });

    console.log("Access token in generateQRCode: ", accessToken);

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`VietQR GenerateQR failed: ${response.status} - ${errorBody}`);
      throw new Error(`Failed to generate VietQR code: ${response.status}`);
    }

    const data: any = await response.json();
    this.logger.log(`VietQR QR code generated successfully. qrLink: ${data.qrLink}`);

    console.log("\n\nResponse from VietQR generateQRCode: ", data);

    // Tạo mã QR dạng Data URL (base64 image) từ chuỗi qrCode thô do VietQR trả về
    const qrDataURL = await QRCode.toDataURL(data.qrCode);

    // Trả về qrDataURL (URL ảnh mã QR), amount, content để Frontend hiển thị và dùng cho confirmPayment
    return { qrDataURL, amount: Math.round(order.totalAmount), content };
  }

  /**
   * Bước 2.1.1.1.1 trong Sequence Diagram v2: postAPICallback(order, accessToken)
   * 
   * Gọi API Test Callback của VietQR Sandbox để giả lập giao dịch thanh toán thành công.
   * Theo tài liệu 5-CallAPITestCallback.md:
   *   - URL: POST https://dev.vietqr.org/vqr/bank/api/test/transaction-callback
   *   - Headers: Authorization: Bearer <token từ VietQR>
   *   - Body: { bankAccount, content, amount, transType, bankCode }
   * 
   * Sau khi VietQR nhận request này, VietQR sẽ tự động gọi API Transaction Sync
   * (postAPIToAIMS) tới endpoint /bank/api/transaction-sync trên hệ thống AIMS
   * để thông báo giao dịch đã hoàn thành.
   * 
   * @param order - Đơn hàng cần xác nhận thanh toán
   * @param accessToken - Token VietQR đã lấy được từ getAccessToken()
   * @returns Kết quả từ VietQR Test Callback API { status, message }
   */
  async postAPICallback(order: Order, accessToken: string): Promise<{ status: string; message: string }> {
    this.logger.log(`Calling VietQR Test Callback API for order ${order.orderId}`);

    // orderId tối đa 13 ký tự, tương tự generateQRCode
    const shortOrderId = order.orderId.replace(/-/g, '').substring(0, 13);
    const content = `AIMS ${shortOrderId}`;

    // Body theo tài liệu 5-CallAPITestCallback.md
    const body = {
      bankAccount: this.BANK_ACCOUNT,
      content: content,
      amount: Math.round(order.totalAmount),
      transType: 'C', // C = giao dịch đến (Credit), mặc định theo tài liệu
      bankCode: this.BANK_CODE,
    };

    this.logger.log(`VietQR Test Callback request body: ${JSON.stringify(body)}`);

    const response = await fetch(this.VIETQR_TEST_CALLBACK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });



    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(`VietQR Test Callback failed: ${response.status} - ${errorBody}`);
      throw new Error(`Failed to call VietQR Test Callback: ${response.status}`);
    }

    const data: any = await response.json();
    this.logger.log(`VietQR Test Callback response: ${JSON.stringify(data)}`);

    console.log("\n\nResponse from VietQR Test Callback: ", data);

    // Response: { status: "SUCCESS", message: "" } hoặc { status: "FAILED", message: "mã_lỗi" }
    return { status: data.status, message: data.message || '' };
  }
}
