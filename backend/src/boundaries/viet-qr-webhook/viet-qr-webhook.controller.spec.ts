import { Test, TestingModule } from '@nestjs/testing';
import { VietQrWebhookController } from './viet-qr-webhook.controller.js';
import { PayThroughVietQrService } from '../../controllers/pay-through-viet-qr/pay-through-viet-qr.service.js';

describe('VietQrWebhookController', () => {
  let controller: VietQrWebhookController;

  beforeEach(async () => {
    const mockPayThroughVietQrService = {
      handleCallback: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VietQrWebhookController],
      providers: [
        { provide: PayThroughVietQrService, useValue: mockPayThroughVietQrService },
      ],
    }).compile();

    controller = module.get<VietQrWebhookController>(VietQrWebhookController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
