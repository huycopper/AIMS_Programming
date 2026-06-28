import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { compare, hash } from 'bcrypt';
import { User, UserStatus } from '../../user/entities/user.entity.js';
import { LoginDto } from '../boundary/dto/login.dto.js';
import { ChangePasswordDto } from '../boundary/dto/change-password.dto.js';
import { CompletePasswordResetDto } from '../boundary/dto/complete-password-reset.dto.js';
import { AuthPrincipal } from '../entity/auth-principal.js';
import { getJwtConfig } from '../auth.module.js';
import { PasswordResetTokenControl } from '../../admin/control/password-reset-token.control.js';

type SupportedRole = 'ADMIN' | 'PRODUCT_MANAGER';

const isSupportedRole = (role: string): role is SupportedRole =>
  role === 'ADMIN' || role === 'PRODUCT_MANAGER';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private dummyHashPromise: Promise<string>;
  private saltRounds: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly passwordResetTokenControl: PasswordResetTokenControl,
  ) {
    // 1. Validate JWT_SECRET
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET configuration is missing.');
    }
    if (Buffer.byteLength(jwtSecret, 'utf8') < 32) {
      throw new Error('JWT_SECRET must be at least 32 UTF-8 bytes.');
    }

    // 2. Validate BCRYPT_SALT_ROUNDS
    const saltRoundsStr = this.configService.get<string>('BCRYPT_SALT_ROUNDS');
    this.saltRounds = saltRoundsStr ? parseInt(saltRoundsStr, 10) : 12;
    if (
      isNaN(this.saltRounds) ||
      this.saltRounds < 10 ||
      this.saltRounds > 14
    ) {
      throw new Error('BCRYPT_SALT_ROUNDS must be between 10 and 14.');
    }

    // 3. Create startup dummy hash
    this.dummyHashPromise = hash(
      'dummy_password_for_denied_login_attempts_at_configured_cost',
      this.saltRounds,
    );
  }

  private async getDummyHash(): Promise<string> {
    return await this.dummyHashPromise;
  }

  validatePasswordPolicy(password: string): boolean {
    if (!password) return false;
    const len = Array.from(password).length;
    if (len < 8) return false;
    if (Buffer.byteLength(password, 'utf8') > 72) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (/^\s/.test(password) || /\s$/.test(password)) return false;
    return true;
  }

  async login(loginDto: LoginDto) {
    const { identifier, password } = loginDto;

    // Reject password values over 72 UTF-8 bytes through generic 401 path
    if (Buffer.byteLength(password || '', 'utf8') > 72) {
      const dummy = await this.getDummyHash();
      await compare('dummy_password_for_timing', dummy);
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials.',
      });
    }

    const cleanIdentifier = (identifier || '').trim();

    const users = await this.dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .addSelect('user.passwordHash')
      .where('user.username = :identifier OR user.email = :identifier', {
        identifier: cleanIdentifier,
      })
      .getMany();

    if (users.length !== 1) {
      const dummy = await this.getDummyHash();
      await compare('dummy_password_for_timing', dummy);
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials.',
      });
    }

    const user = users[0];

    const matches = await compare(password || '', user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials.',
      });
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials.',
      });
    }

    const supportedRoles = user.roles.map((r) => r.roleName).filter(isSupportedRole);

    if (supportedRoles.length === 0) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials.',
      });
    }

    const uniqueRoles = Array.from(new Set(supportedRoles));

    const payload = {
      sub: user.userId,
      roles: uniqueRoles,
    };

    const accessToken = this.jwtService.sign(payload);

    const jwtConfig = getJwtConfig(this.configService);
    const expiresSeconds = jwtConfig.expiresSeconds;

    return {
      accessToken,
      tokenType: 'Bearer' as const,
      expiresIn: expiresSeconds,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        roles: uniqueRoles,
      },
    };
  }

  async getMe(principal: AuthPrincipal) {
    const user = await this.dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.userId = :userId', { userId: principal.userId })
      .getOne();

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required.',
      });
    }

    const dbRoleNames = user.roles.map((r) => r.roleName);
    const supportedRoles = dbRoleNames.filter(isSupportedRole);
    const effectiveRoles = principal.roles
      .filter(isSupportedRole)
      .filter((role) => supportedRoles.includes(role));

    const uniqueRoles = Array.from(new Set(effectiveRoles));

    return {
      userId: user.userId,
      username: user.username,
      email: user.email,
      roles: uniqueRoles,
    };
  }

  async changePassword(
    principal: AuthPrincipal,
    changePasswordDto: ChangePasswordDto,
  ) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.userId = :userId', { userId: principal.userId })
      .getOne();

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required.',
      });
    }

    if (Buffer.byteLength(currentPassword || '', 'utf8') > 72) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'CURRENT_PASSWORD_INVALID',
        message: 'Current password is incorrect.',
      });
    }

    const currentMatches = await compare(
      currentPassword || '',
      user.passwordHash,
    );
    if (!currentMatches) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'CURRENT_PASSWORD_INVALID',
        message: 'Current password is incorrect.',
      });
    }

    const isSame = await compare(newPassword, user.passwordHash);
    if (isSame) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'PASSWORD_POLICY_VIOLATION',
        message: 'New password cannot be the same as the current password.',
      });
    }

    if (!this.validatePasswordPolicy(newPassword)) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'PASSWORD_POLICY_VIOLATION',
        message: 'New password does not meet the policy requirements.',
      });
    }

    const newHash = await hash(newPassword, this.saltRounds);

    const updateResult = await this.dataSource
      .getRepository(User)
      .createQueryBuilder()
      .update(User)
      .set({ passwordHash: newHash })
      .where(
        'userId = :userId AND status = :status AND passwordHash = :oldHash',
        {
          userId: user.userId,
          status: 'ACTIVE',
          oldHash: user.passwordHash,
        },
      )
      .execute();

    if (updateResult.affected !== 1) {
      const checkUser = await this.dataSource.getRepository(User).findOneBy({ userId: user.userId });
      if (!checkUser || checkUser.status !== 'ACTIVE') {
        throw new UnauthorizedException({
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required.',
        });
      }
      throw new BadRequestException({
        statusCode: 400,
        code: 'PASSWORD_POLICY_VIOLATION',
        message: 'Password update failed (concurrency mismatch or account inactive).',
      });
    }
  }

  async completePasswordReset(dto: CompletePasswordResetDto): Promise<void> {
    const tokenEntity = await this.passwordResetTokenControl.verifyAndConsumeToken(dto.token);

    const user = tokenEntity.user;
    if (!user) {
      this.logger.warn('completePasswordReset failed — token has no associated user');
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_RESET_TOKEN',
        message: 'Invalid or expired password reset token.',
      });
    }

    if (user.status !== 'ACTIVE') {
      this.logger.warn(`completePasswordReset failed — user not active (userId=${user.userId}, status=${user.status})`);
      throw new BadRequestException({
        statusCode: 400,
        code: 'USER_NOT_ACTIVE',
        message: 'User account is not active.',
      });
    }

    if (!this.validatePasswordPolicy(dto.newPassword)) {
      this.logger.warn(`completePasswordReset failed — password policy violation (userId=${user.userId})`);
      throw new BadRequestException({
        statusCode: 400,
        code: 'PASSWORD_POLICY_VIOLATION',
        message: 'New password does not meet the policy requirements.',
      });
    }

    const newHash = await hash(dto.newPassword, this.saltRounds);

    await this.dataSource.getRepository(User).update(user.userId, {
      passwordHash: newHash,
    });

    this.logger.log(`Password reset completed successfully — userId=${user.userId}`);
  }
}
