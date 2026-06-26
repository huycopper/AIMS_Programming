import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity.js';
import { Role } from '../user/entities/role.entity.js';
import { UserRole } from '../user/entities/user-role.entity.js';
import { AdminAuditLog } from './entity/admin-audit-log.entity.js';
import { PasswordResetToken } from './entity/password-reset-token.entity.js';
import { AdminUsersController } from './boundary/admin-users.controller.js';
import { AdminUsersService } from './control/admin-users.service.js';
import { AdminAuditLogControl } from './control/admin-audit-log.control.js';
import { AdminNotificationControl } from './control/admin-notification.control.js';
import { PasswordResetTokenControl } from './control/password-reset-token.control.js';
import { AuthModule } from '../auth/auth.module.js';
import { PayOrderNotificationModule } from '../pay-order/notification/pay-order-notification.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      UserRole,
      AdminAuditLog,
      PasswordResetToken,
    ]),
    forwardRef(() => AuthModule),
    PayOrderNotificationModule,
  ],
  controllers: [AdminUsersController],
  providers: [
    AdminUsersService,
    AdminAuditLogControl,
    AdminNotificationControl,
    PasswordResetTokenControl,
  ],
  exports: [
    AdminUsersService,
    AdminAuditLogControl,
    AdminNotificationControl,
    PasswordResetTokenControl,
    TypeOrmModule,
  ],
})
export class AdminModule {}
