import { Injectable, Logger } from '@nestjs/common';
import { Order } from '../../order/entities/order.entity.js';

@Injectable()
export class VietQRBoundary {
  private readonly logger = new Logger(VietQRBoundary.name);

  // In a real app, this would make an HTTP request to VietQR API
  // Using Sandbox values here as per the story requirements
  async getAccessToken(): Promise<string> {
    this.logger.log('Fetching VietQR Sandbox access token...');
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return 'sandbox_access_token_' + Date.now();
  }

  // Simulate generating a QR code from VietQR Sandbox
  async generateQRCode(order: Order, accessToken: string): Promise<{ qrDataURL: string }> {
    this.logger.log(`Generating VietQR for order ${order.orderId} with token ${accessToken}`);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // In a real integration, we would send order amount, description, etc.
    // and receive a base64 image or a text string.
    // Since this is a sandbox simulation, we'll return a dummy data URL or text.
    // Normally, a vietqr string starts with '000201...' 
    const dummyQr = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; 
    return { qrDataURL: dummyQr };
  }
}
