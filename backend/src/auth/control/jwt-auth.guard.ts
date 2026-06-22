import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../../user/entities/user.entity.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required.',
      });
    }

    const token = authHeader.substring(7);

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch (err) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required.',
      });
    }

    if (!payload || !payload.sub) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required.',
      });
    }

    // Authoritative check against the database
    const user = await this.dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .where('user.userId = :userId', { userId: payload.sub })
      .getOne();

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required.',
      });
    }

    const dbRoleNames = user.roles.map((r) => r.roleName);
    const tokenRoles = Array.isArray(payload.roles) ? payload.roles : [];
    const effectiveRoles = tokenRoles.filter((role: string) =>
      dbRoleNames.includes(role),
    );

    request.user = {
      userId: user.userId,
      username: user.username,
      email: user.email,
      roles: effectiveRoles,
    };

    return true;
  }
}
