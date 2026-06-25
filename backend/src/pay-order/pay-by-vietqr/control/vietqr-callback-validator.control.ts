import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class VietQrCallbackValidatorControl {
  private readonly logger = new Logger(VietQrCallbackValidatorControl.name);

  constructor(private readonly jwtService: JwtService) { }

  //
  validateCallbackToken(token: string): boolean {
    if (!process.env.JWT_SECRET) {
      this.logger.error('JWT_SECRET is not configured');
      return false;
    }

    try {
      this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      return true;
    } catch {
      return false;
    }
  }

  generateJWTToken(username: string, password: string) {
    this.logger.log(`Generating JWT token for client username: ${username}`);

    if (username === process.env.CLIENT_USERNAME && password === process.env.CLIENT_PASSWORD) {
      if (!process.env.JWT_SECRET) {
        this.logger.error('JWT_SECRET is not configured');
        throw new InternalServerErrorException({
          status: 'FAILED',
          message: 'JWT_SECRET is not configured',
        });
      }

      const JWT_token = this.jwtService.sign(
        { username },
        {
          secret: process.env.JWT_SECRET,
          algorithm: 'HS512',
          expiresIn: '5m', // Token hết hạn sau 5 phút
        },
      );

      this.logger.log('JWT token generated successfully');

      return {
        access_token: JWT_token,
        token_type: 'Bearer',
        expires_in: 300,
      };
    } else {
      this.logger.warn(`Invalid credentials provided for username: ${username}`);
      throw new UnauthorizedException({
        status: 'FAILED',
        message: 'INVALID_CREDENTIALS',
      });
    }
  }
}
