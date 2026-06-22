import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './control/auth.service.js';
import { AuthController } from './boundary/auth.controller.js';
import { User } from '../user/entities/user.entity.js';
import { Role } from '../user/entities/role.entity.js';
import { UserRole } from '../user/entities/user-role.entity.js';
import { JwtAuthGuard } from './control/jwt-auth.guard.js';
import { RolesGuard } from './control/roles.guard.js';

export function getJwtConfig(configService: ConfigService) {
  let expiresInString = configService.get<string>('JWT_EXPIRES_IN');
  const nodeEnv = configService.get<string>('NODE_ENV');
  if (!expiresInString) {
     if (nodeEnv !== 'development' && nodeEnv !== 'test' && nodeEnv !== 'local') {
       throw new Error('JWT_EXPIRES_IN must be explicitly configured in non-test environments.');
     }
     expiresInString = '1h';
  }
  let expiresSeconds = 3600;
  if (expiresInString.endsWith('h')) {
    expiresSeconds = parseInt(expiresInString, 10) * 3600;
  } else if (expiresInString.endsWith('m')) {
    expiresSeconds = parseInt(expiresInString, 10) * 60;
  } else if (expiresInString.endsWith('s')) {
    expiresSeconds = parseInt(expiresInString, 10);
  } else if (expiresInString.endsWith('d')) {
    expiresSeconds = parseInt(expiresInString, 10) * 86400;
  } else {
    expiresSeconds = parseInt(expiresInString, 10) || 3600;
  }
  return { expiresInString, expiresSeconds };
}

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, UserRole]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        const jwtConfig = getJwtConfig(configService);
        return {
          secret,
          signOptions: {
            algorithm: 'HS256',
            expiresIn: jwtConfig.expiresInString as any,
          },
          verifyOptions: {
            algorithms: ['HS256'],
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule, TypeOrmModule],
})
export class AuthModule {}
