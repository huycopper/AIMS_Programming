import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAuditLogControl, sanitizeMetadata } from './admin-audit-log.control.js';
import { AdminAuditLog } from '../entity/admin-audit-log.entity.js';

describe('AdminAuditLogControl', () => {
  let control: AdminAuditLogControl;
  let repo: jest.Mocked<Repository<AdminAuditLog>>;

  beforeEach(async () => {
    repo = {
      save: jest.fn(),
      update: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuditLogControl,
        {
          provide: getRepositoryToken(AdminAuditLog),
          useValue: repo,
        },
      ],
    }).compile();

    control = module.get<AdminAuditLogControl>(AdminAuditLogControl);
  });

  describe('sanitizeMetadata', () => {
    it('should redact sensitive keys like password, token, secret, jwt, auth, hash', () => {
      const metadata = {
        username: 'admin',
        password: 'PlainTextPassword1',
        nested: {
          tokenHash: 'xyz',
          secretValue: 'secret',
          jwtString: 'jwt',
          authHeader: 'auth',
          safeField: 'safe',
        },
        safeArray: [
          { auth: '123' },
          { safe: '456' },
        ],
      };

      const sanitized = sanitizeMetadata(metadata);

      expect(sanitized.username).toBe('admin');
      expect(sanitized.password).toBe('<redacted>');
      expect(sanitized.nested.tokenHash).toBe('<redacted>');
      expect(sanitized.nested.secretValue).toBe('<redacted>');
      expect(sanitized.nested.jwtString).toBe('<redacted>');
      expect(sanitized.nested.authHeader).toBe('<redacted>');
      expect(sanitized.nested.safeField).toBe('safe');
      expect(sanitized.safeArray[0].auth).toBe('<redacted>');
      expect(sanitized.safeArray[1].safe).toBe('456');
    });

    it('should return safe values directly', () => {
      expect(sanitizeMetadata(null)).toBeNull();
      expect(sanitizeMetadata(undefined)).toBeUndefined();
      expect(sanitizeMetadata(123)).toBe(123);
      expect(sanitizeMetadata('string')).toBe('string');
    });
  });

  describe('recordSensitiveAction', () => {
    it('should sanitize metadata and save the log entry', async () => {
      const mockLog = { auditLogId: 'uuid123' };
      repo.save.mockResolvedValue(mockLog as any);

      const input = {
        actorUserId: 'actor-id',
        affectedUserId: 'affected-id',
        actionType: 'USER_CREATED',
        metadataBefore: { password: 'pwd', field: 'safe' },
        metadataAfter: { secret: 'secret', field: 'safe2' },
        reason: 'some reason',
        notificationEmail: 'user@example.com',
      };

      const result = await control.recordSensitiveAction(input);

      expect(repo.save).toHaveBeenCalled();
      const saved = repo.save.mock.calls[0][0];
      expect(saved.actorUserId).toBe('actor-id');
      expect(saved.affectedUserId).toBe('affected-id');
      expect(saved.actionType).toBe('USER_CREATED');
      expect(saved.metadataBefore!.password).toBe('<redacted>');
      expect(saved.metadataBefore!.field).toBe('safe');
      expect(saved.metadataAfter!.secret).toBe('<redacted>');
      expect(saved.metadataAfter!.field).toBe('safe2');
      expect(saved.reason).toBe('some reason');
      expect(saved.notificationEmail).toBe('user@example.com');
      expect(saved.notificationStatus).toBe('NOT_ATTEMPTED');
      expect(result).toBe(mockLog);
    });
  });

  describe('updateNotificationStatus', () => {
    it('should update the notification status of an audit log entry', async () => {
      repo.update.mockResolvedValue({} as any);

      await control.updateNotificationStatus('log-id', 'SENT');

      expect(repo.update).toHaveBeenCalledWith('log-id', { notificationStatus: 'SENT' });
    });
  });
});
