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

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, UserRole]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '1h';
        return {
          secret,
          signOptions: {
            algorithm: 'HS256',
            expiresIn: expiresIn as any,
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
