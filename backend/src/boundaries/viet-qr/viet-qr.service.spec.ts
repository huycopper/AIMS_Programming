import { Test, TestingModule } from '@nestjs/testing';
import { VietQrService } from './viet-qr.service';

describe('VietQrService', () => {
  let service: VietQrService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VietQrService],
    }).compile();

    service = module.get<VietQrService>(VietQrService);
    
    global.fetch = jest.fn() as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateQRCode', () => {
    it('should generate QR code URL', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          code: '00',
          data: {
            qrDataURL: 'data:image/png;base64,mock',
          },
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const url = await service.generateQRCode(100000, 'ord-1');
      expect(url).toBe('data:image/png;base64,mock');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should throw error if fetch fails', async () => {
      const mockResponse = {
        ok: false,
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(service.generateQRCode(100000, 'ord-1')).rejects.toThrow('Failed to generate VietQR code');
    });
  });

  describe('verifyPaymentCallback', () => {
    it('should return true for valid payload', () => {
      expect(service.verifyPaymentCallback({ amount: 100, content: 'Payment' })).toBe(true);
    });

    it('should return false for invalid payload', () => {
      expect(service.verifyPaymentCallback({})).toBe(false);
    });
  });
});
