import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, EntityManager } from 'typeorm';
import { PasswordResetToken } from '../entity/password-reset-token.entity.js';
import crypto from 'crypto';

@Injectable()
export class PasswordResetTokenControl {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokenRepo: Repository<PasswordResetToken>,
  ) {}

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async generateToken(
    userId: string,
    createdBy: string | null,
    expiryMinutes = 60,
    entityManager?: EntityManager,
  ): Promise<{ rawToken: string; entity: PasswordResetToken }> {
    const repo = entityManager ? entityManager.getRepository(PasswordResetToken) : this.tokenRepo;

    // Invalidate existing unused tokens for this user
    await repo.update(
      { userId, usedAt: IsNull() },
      { usedAt: new Date() }, // effectively invalidate them by marking as used
    );

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    const tokenEntity = new PasswordResetToken();
    tokenEntity.resetTokenId = crypto.randomUUID();
    tokenEntity.userId = userId;
    tokenEntity.tokenHash = tokenHash;
    tokenEntity.createdAt = new Date();
    tokenEntity.expiresAt = new Date(Date.now() + expiryMinutes * 60000);
    tokenEntity.usedAt = null;
    tokenEntity.createdBy = createdBy;

    const saved = await repo.save(tokenEntity);
    return { rawToken, entity: saved };
  }

  async verifyAndConsumeToken(rawToken: string): Promise<PasswordResetToken> {
    const tokenHash = this.hashToken(rawToken);

    const tokenEntity = await this.tokenRepo.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    if (!tokenEntity) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_RESET_TOKEN',
        message: 'Invalid or expired password reset token.',
      });
    }

    if (tokenEntity.usedAt !== null) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_RESET_TOKEN',
        message: 'Invalid or expired password reset token.',
      });
    }

    if (tokenEntity.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_RESET_TOKEN',
        message: 'Invalid or expired password reset token.',
      });
    }

    // Mark as used
    tokenEntity.usedAt = new Date();
    return await this.tokenRepo.save(tokenEntity);
  }
}
