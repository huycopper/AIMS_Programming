import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from '../control/auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CompletePasswordResetDto } from './dto/complete-password-reset.dto.js';
import { JwtAuthGuard } from '../control/jwt-auth.guard.js';

@Controller('api/auth')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, validationError: { target: false, value: false } }))
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    return this.authService.getMe(req.user);
  }

  @Post('change-password')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(req.user, changePasswordDto);
  }

  @Post('password-reset/complete')
  @HttpCode(204)
  async completePasswordReset(
    @Body() completePasswordResetDto: CompletePasswordResetDto,
  ) {
    await this.authService.completePasswordReset(completePasswordResetDto);
  }
}
