import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email/email.service.js';
import { NotificationService } from './notification.service.js';

@Module({
  imports: [ConfigModule],
  providers: [EmailService, NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
