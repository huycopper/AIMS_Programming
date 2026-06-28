import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity.js';

@Entity('admin_audit_logs')
export class AdminAuditLog {
  @PrimaryColumn('uuid', { name: 'audit_log_id' })
  auditLogId: string;

  @Column('uuid', { name: 'actor_user_id' })
  actorUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_user_id' })
  actor: User;

  @Column('uuid', { name: 'affected_user_id', nullable: true })
  affectedUserId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'affected_user_id' })
  affectedUser: User | null;

  @Column('varchar', { name: 'action_type', length: 100 })
  actionType: string;

  @Column('timestamp', { name: 'action_time' })
  actionTime: Date;

  @Column('jsonb', { name: 'metadata_before', nullable: true })
  metadataBefore: Record<string, any> | null;

  @Column('jsonb', { name: 'metadata_after', nullable: true })
  metadataAfter: Record<string, any> | null;

  @Column('text', { name: 'reason', nullable: true })
  reason: string | null;

  @Column('varchar', { name: 'notification_email', length: 255, nullable: true })
  notificationEmail: string | null;

  @Column('varchar', { name: 'notification_status', length: 50, default: 'NOT_ATTEMPTED' })
  notificationStatus: string;
}
