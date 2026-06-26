import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { PasswordResetTokenControl } from './password-reset-token.control.js';
import { PasswordResetToken } from '../entity/password-reset-token.entity.js';
import { BadRequestException } from '@nestjs/common';

describe('PasswordResetTokenControl', () => {
  let control: PasswordResetTokenControl;
  let repo: jest.Mocked<Repository<PasswordResetToken>>;

  beforeEach(async () => {
    repo = {
      update: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetTokenControl,
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: repo,
        },
      ],
    }).compile();

    control = module.get<PasswordResetTokenControl>(PasswordResetTokenControl);
  });

  describe('generateToken', () => {
    it('should invalidate existing tokens and generate a new secure hashed token', async () => {
      repo.update.mockResolvedValue({} as any);
      repo.save.mockImplementation((entity) => Promise.resolve(entity as PasswordResetToken));

      const { rawToken, entity } = await control.generateToken('user-id', 'creator-id', 30);

      expect(repo.update).toHaveBeenCalledWith(
        { userId: 'user-id', usedAt: IsNull() },
        expect.objectContaining({ usedAt: expect.any(Date) }),
      );
      expect(rawToken).toHaveLength(64); // hex representation of 32 random bytes
      expect(entity.tokenHash).toBe(control.hashToken(rawToken));
      expect(entity.userId).toBe('user-id');
      expect(entity.createdBy).toBe('creator-id');
      expect(entity.usedAt).toBeNull();
      expect(entity.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('verifyAndConsumeToken', () => {
    it('should return and consume a valid unused and unexpired token', async () => {
      const mockToken = new PasswordResetToken();
      mockToken.tokenHash = 'hash';
      mockToken.usedAt = null;
      mockToken.expiresAt = new Date(Date.now() + 60000);
      mockToken.userId = 'user-id';

      repo.findOne.mockResolvedValue(mockToken);
      repo.save.mockImplementation((entity) => Promise.resolve(entity as PasswordResetToken));

      const result = await control.verifyAndConsumeToken('raw');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { tokenHash: control.hashToken('raw') },
        relations: { user: true },
      });
      expect(result.usedAt).toBeInstanceOf(Date);
      expect(repo.save).toHaveBeenCalledWith(result);
    });

    it('should throw BadRequestException if token does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(control.verifyAndConsumeToken('raw')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if token is already used', async () => {
      const mockToken = new PasswordResetToken();
      mockToken.usedAt = new Date();
      mockToken.expiresAt = new Date(Date.now() + 60000);
      repo.findOne.mockResolvedValue(mockToken);

      await expect(control.verifyAndConsumeToken('raw')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if token is expired', async () => {
      const mockToken = new PasswordResetToken();
      mockToken.usedAt = null;
      mockToken.expiresAt = new Date(Date.now() - 1000); // 1s ago
      repo.findOne.mockResolvedValue(mockToken);

      await expect(control.verifyAndConsumeToken('raw')).rejects.toThrow(BadRequestException);
    });
  });
});
