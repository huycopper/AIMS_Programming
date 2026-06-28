import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity.js';

@Entity('password_reset_tokens')
export class PasswordResetToken {
  @PrimaryColumn('uuid', { name: 'reset_token_id' })
  resetTokenId: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('text', { name: 'token_hash', unique: true })
  tokenHash: string;

  @Column('timestamp', { name: 'expires_at' })
  expiresAt: Date;

  @Column('timestamp', { name: 'used_at', nullable: true })
  usedAt: Date | null;

  @Column('uuid', { name: 'created_by', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;

  @Column('timestamp', { name: 'created_at' })
  createdAt: Date;
}
