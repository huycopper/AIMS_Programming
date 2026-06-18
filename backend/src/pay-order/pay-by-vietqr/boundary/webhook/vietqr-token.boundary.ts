import {
  Controller,
  Post,
  Headers,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { VietQrCallbackValidatorControl } from '../../control/vietqr-callback-validator.control.js';

@Controller()
export class VietQrTokenBoundary {
  private readonly logger = new Logger(VietQrTokenBoundary.name);

  constructor(
    private readonly callbackValidator: VietQrCallbackValidatorControl,
  ) { }

  @Post('vqr/api/token_generate')
  token_generate(@Headers('authorization') authHeader: string) {
    this.logger.log('Received token_generate request from VietQR');

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new HttpException(
        { error: 'Authorization header is missing or invalid' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    this.logger.log(`Username: ${username}`);
    this.logger.log(`Password: ${password}`);
    return this.callbackValidator.generateJWTToken(username, password);
  }
}
