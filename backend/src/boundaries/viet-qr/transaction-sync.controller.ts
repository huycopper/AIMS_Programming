import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { TransactionSyncService } from '../../payment/services/transaction-sync.service.js';

@Controller()
export class TransactionSyncController {
  private readonly logger = new Logger(TransactionSyncController.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly transactionSyncService: TransactionSyncService,
  ) {}

  /*
   * Endpoint for VietQR to obtain the AIMS callback Bearer token.
   * A /vqr prefix here is part of the VietQR token-generation contract only.
   */
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

    return this.generateJWTToken(username, password);
  }

  generateJWTToken(username: string, password: string) {
    this.logger.log(`Generating JWT token for client username: ${username}`);

    if (
      username === process.env.CLIENT_USERNAME &&
      password === process.env.CLIENT_PASSWORD
    ) {
      if (!process.env.JWT_SECRET) {
        this.logger.error('JWT_SECRET is not configured');
        throw new InternalServerErrorException({
          status: 'FAILED',
          message: 'JWT_SECRET is not configured',
        });
      }

      const jwtToken = this.jwtService.sign(
        { username },
        {
          secret: process.env.JWT_SECRET,
          algorithm: 'HS512',
          expiresIn: '5m',
        },
      );

      return {
        access_token: jwtToken,
        token_type: 'Bearer',
        expires_in: 300,
      };
    }

    throw new UnauthorizedException({
      status: 'FAILED',
      message: 'INVALID_CREDENTIALS',
    });
  }

  @Post('bank/api/transaction-sync')
  async transactionSync(
    @Body() transactionSyncBody: unknown,
    @Headers('authorization') authHeader: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.transactionSyncService.handleTransactionSync(
      transactionSyncBody,
      authHeader,
    );

    return res.status(result.statusCode).json(result.body);
  }
}
