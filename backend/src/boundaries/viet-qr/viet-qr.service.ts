import { Injectable } from '@nestjs/common';

@Injectable()
export class VietQrService {
  private readonly apiUrl = 'https://api.vietqr.io/v2/generate';
  private readonly clientId = process.env.VIETQR_CLIENT_ID || 'client-id';
  private readonly apiKey = process.env.VIETQR_API_KEY || 'api-key';

  // Fixed bank info for the store (AIMS)
  private readonly bankId = 'MB'; // MBBank
  private readonly accountNo = '123456789';
  private readonly accountName = 'AIMS STORE';

  async generateQRCode(amount: number, orderId: string): Promise<string> {
    const payload = {
      accountNo: this.accountNo,
      accountName: this.accountName,
      acqId: 970422, // MBBank BIN
      amount: amount,
      addInfo: `Payment for order ${orderId}`,
      format: 'text',
      template: 'compact'
    };

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': this.clientId,
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to generate VietQR code');
      }

      const data = await response.json();
      if (data.code !== '00') {
        throw new Error(data.desc || 'VietQR API returned error');
      }

      // Return the data URL of the QR image
      return data.data.qrDataURL;
    } catch (error) {
      console.error('Error generating QR:', error);
      throw error;
    }
  }

  verifyPaymentCallback(payload: any): boolean {
    // In a real system, you verify signatures. For this project simulation, 
    // we assume the webhook payload is valid if it has basic fields.
    if (payload && payload.amount && payload.content) {
      return true;
    }
    return false;
  }
}
