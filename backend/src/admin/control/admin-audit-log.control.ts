import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { AdminAuditLog } from '../entity/admin-audit-log.entity.js';
import crypto from 'crypto';

export function sanitizeMetadata(data: any): any {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map(item => sanitizeMetadata(item));
  }
  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('hash') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('jwt') ||
        lowerKey.includes('auth') ||
        lowerKey.includes('credential')
      ) {
        sanitized[key] = '<redacted>';
      } else {
        sanitized[key] = sanitizeMetadata(data[key]);
      }
    }
    return sanitized;
  }
  return data;
}

export interface RecordActionInput {
  actorUserId: string;
  affectedUserId: string | null;
  actionType: string;
  metadataBefore?: any;
  metadataAfter?: any;
  reason?: string | null;
  notificationEmail?: string | null;
  notificationStatus?: string;
}

@Injectable()
export class AdminAuditLogControl {
  private readonly logger = new Logger(AdminAuditLogControl.name);

  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly auditLogRepo: Repository<AdminAuditLog>,
  ) {}

  async recordSensitiveAction(
    input: RecordActionInput,
    entityManager?: EntityManager,
  ): Promise<AdminAuditLog> {
    const repo = entityManager ? entityManager.getRepository(AdminAuditLog) : this.auditLogRepo;

    const log = new AdminAuditLog();
    log.auditLogId = crypto.randomUUID();
    log.actorUserId = input.actorUserId;
    log.affectedUserId = input.affectedUserId;
    log.actionType = input.actionType;
    log.actionTime = new Date();
    log.metadataBefore = input.metadataBefore ? sanitizeMetadata(input.metadataBefore) : null;
    log.metadataAfter = input.metadataAfter ? sanitizeMetadata(input.metadataAfter) : null;
    log.reason = input.reason || null;
    log.notificationEmail = input.notificationEmail || null;
    log.notificationStatus = input.notificationStatus || 'NOT_ATTEMPTED';

    const saved = await repo.save(log);
    this.logger.log(`Audit log recorded — id=${saved.auditLogId}, action=${input.actionType}, actor=${input.actorUserId}, affected=${input.affectedUserId || 'N/A'}`);
    return saved;
  }

  async updateNotificationStatus(
    auditLogId: string,
    status: string,
    entityManager?: EntityManager,
  ): Promise<void> {
    const repo = entityManager ? entityManager.getRepository(AdminAuditLog) : this.auditLogRepo;
    await repo.update(auditLogId, { notificationStatus: status });
    this.logger.debug(`Audit notification status updated — logId=${auditLogId}, status=${status}`);
  }
}
