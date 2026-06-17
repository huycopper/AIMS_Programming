import * as QRCode from 'qrcode';
import { VietQRBoundary } from './viet-qr.service';
import { Order } from '../../order/entities/order.entity';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

describe('VietQRBoundary', () => {
  const originalEnv = process.env;
  const fetchMock = jest.fn();

  const order = {
    orderId: '550e8400-e29b-41d4-a716-446655440000',
    totalAmount: 125000.4,
  } as Order;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      VIETQR_TOKEN_URL: 'https://vietqr.example/token',
      VIETQR_GENERATE_URL: 'https://vietqr.example/generate',
      VIETQR_TEST_CALLBACK_URL: 'https://vietqr.example/test-callback',
      VIETQR_USERNAME: 'merchant',
      VIETQR_PASSWORD: 'secret',
      BANK_CODE: 'MB',
      BANK_ACCOUNT: '123456789',
      USER_BANK_NAME: 'AIMS STORE',
    };
    global.fetch = fetchMock;
    (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,qr');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('maps QR generation request fields to the VietQR dynamic QR contract', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token-1', expires_in: 300 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ qrCode: 'raw-qr-code', qrLink: 'https://qr.example' }),
      });

    const gateway = new VietQRBoundary();
    const result = await gateway.generateQRCode(order);

    expect(result).toEqual({
      qrDataURL: 'data:image/png;base64,qr',
      amount: 125000,
      content: 'AIMS 550e8400e29b4',
      orderId: '550e8400e29b4',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://vietqr.example/generate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token-1' }),
        body: JSON.stringify({
          bankCode: 'MB',
          bankAccount: '123456789',
          userBankName: 'AIMS STORE',
          content: 'AIMS 550e8400e29b4',
          qrType: 0,
          amount: 125000,
          orderId: '550e8400e29b4',
          transType: 'C',
        }),
      }),
    );
  });

  it('calls the Test Callback with its own valid token even without previous QR generation state', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'callback-token', expires_in: 300 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'SUCCESS', message: '' }),
      });

    const gateway = new VietQRBoundary();
    const result = await gateway.handleAPICallback(order);

    expect(result).toEqual({ status: 'SUCCESS', message: '' });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://vietqr.example/test-callback',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer callback-token' }),
        body: JSON.stringify({
          bankAccount: '123456789',
          content: 'AIMS 550e8400e29b4',
          amount: 125000,
          transType: 'C',
          bankCode: 'MB',
        }),
      }),
    );
  });
});
