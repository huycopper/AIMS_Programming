import { Test, TestingModule } from '@nestjs/testing';
import { PayThroughVietQrController } from './pay-through-viet-qr.controller.js';
import { PayThroughVietQrService } from './pay-through-viet-qr.service.js';

describe('PayThroughVietQrController', () => {
  let controller: PayThroughVietQrController;

  beforeEach(async () => {
    const mockService = {
      processPayment: jest.fn(),
      handleCallback: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayThroughVietQrController],
      providers: [
        { provide: PayThroughVietQrService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<PayThroughVietQrController>(PayThroughVietQrController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
