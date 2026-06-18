import { Controller, Post, Body, Headers, Logger, Res } from '@nestjs/common';
import type { Response } from 'express';
import { TransactionCallbackDto } from '../../entity/vietqr-transaction-sync.dto.js';
import {
  SuccessResponse,
  ErrorResponse,
  TransactionResponseObject,
} from './dto/vietqr-transaction-sync.response.js';
import { VietQrCallbackValidatorControl } from '../../control/vietqr-callback-validator.control.js';
import { VietQrTransactionSyncControl } from '../../control/vietqr-transaction-sync.control.js';

@Controller()
export class VietQrTransactionSyncBoundary {
  private readonly logger = new Logger(VietQrTransactionSyncBoundary.name);

  constructor(
    private readonly callbackValidator: VietQrCallbackValidatorControl,
    private readonly transactionSyncControl: VietQrTransactionSyncControl,
  ) { }

  @Post('vqr/bank/api/transaction-sync')
  async transactionSync(
    // parse JSON trong phần Body của HTTP POST request và map (gán) nó vào biến transactionSyncBody. 
    // body của VietQR POST đến có dạng TransactionCallbackDto
    @Body() transactionSyncBody: TransactionCallbackDto,
    //Trích xuất giá trị của một HTTP Header có tên authorization và gán vào biến authHeader
    @Headers('authorization') authHeader: string,
    //inject object HTTP Response (Res lấy từ thư viện nestJS) để có thể trả về response với status code và JSON body tùy chỉnh
    @Res() res: Response,
  ) {
    this.logger.log('=== VietQR Transaction Sync Received ===');
    this.logger.log(`Callback data: ${JSON.stringify(transactionSyncBody)}`);

    // 1. Valid header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.error('Invalid or missing Authorization header');
      return res
        .status(401)
        .json(
          new ErrorResponse(
            true,
            'INVALID_AUTH_HEADER',
            'Authorization header is missing or invalid',
            null,
          ),
        );
    }

    // 2. Valid token
    const token = authHeader.substring('Bearer '.length).trim();
    if (!this.callbackValidator.validateCallbackToken(token)) {
      this.logger.error('Invalid or expired Bearer token');
      return res
        .status(401)
        .json(
          new ErrorResponse(
            true,
            'INVALID_TOKEN',
            'Invalid or expired token',
            null,
          ),
        );
    }

    try {
      const { refTransactionId } = await this.transactionSyncControl.syncTransaction(transactionSyncBody);

      //
      this.logger.log('=== Transaction Sync processed successfully ===');
      return res
        .status(200)
        .json(
          new SuccessResponse(
            false,
            null,
            'Transaction processed successfully',
            new TransactionResponseObject(refTransactionId),
          ),
        );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown transaction sync error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Transaction Sync processing error: ${message}`, stack);
      return res
        .status(400)
        .json(new ErrorResponse(true, 'TRANSACTION_FAILED', message, null));
    }
  }
}
