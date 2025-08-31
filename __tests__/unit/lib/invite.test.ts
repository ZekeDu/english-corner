import { InviteService } from '@/lib/invite';
import { prisma } from '@/lib/db';

// Mock prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    invite: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe('InviteService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateInviteCode', () => {
    it('should generate a 6-character invite code', () => {
      const code = InviteService.generateInviteCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should generate different codes on multiple calls', () => {
      const code1 = InviteService.generateInviteCode();
      const code2 = InviteService.generateInviteCode();
      expect(code1).not.toBe(code2);
    });
  });

  describe('createInvite', () => {
    it('should create a new invite with generated code', async () => {
      const mockInvite = {
        id: 'invite123',
        inviteCode: 'ABCDEF',
        inviterId: 1,
        invitedEmail: 'test@example.com',
        status: 'pending',
        createdAt: new Date(),
      };

      (prisma.invite.create as jest.Mock).mockResolvedValue(mockInvite);

      const result = await InviteService.createInvite(1, 'test@example.com');

      expect(prisma.invite.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inviterId: 1,
          invitedEmail: 'test@example.com',
          inviteCode: expect.any(String),
        }),
      });
      expect(result).toEqual(mockInvite);
    });
  });

  describe('validateInvite', () => {
    it('should return valid for existing pending invite', async () => {
      const mockInvite = {
        id: 'invite123',
        inviteCode: 'ABCDEF',
        inviterId: 1,
        invitedEmail: 'test@example.com',
        status: 'pending',
        createdAt: new Date(),
        inviter: {
          id: 1,
          email: 'inviter@example.com',
          nickname: 'Test User',
        },
      };

      (prisma.invite.findUnique as jest.Mock).mockResolvedValue(mockInvite);

      const result = await InviteService.validateInvite('ABCDEF');

      expect(result.valid).toBe(true);
      expect(result.invite).toEqual(mockInvite);
    });

    it('should return invalid for non-existent invite', async () => {
      (prisma.invite.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await InviteService.validateInvite('INVALID');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('邀请码不存在');
    });

    it('should return invalid for already used invite', async () => {
      const mockInvite = {
        id: 'invite123',
        inviteCode: 'ABCDEF',
        status: 'accepted',
      };

      (prisma.invite.findUnique as jest.Mock).mockResolvedValue(mockInvite);

      const result = await InviteService.validateInvite('ABCDEF');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('邀请码已被使用');
    });
  });

  describe('markInviteUsed', () => {
    it('should update invite status to accepted', async () => {
      const mockInvite = {
        id: 'invite123',
        inviteCode: 'ABCDEF',
        status: 'accepted',
      };

      (prisma.invite.update as jest.Mock).mockResolvedValue(mockInvite);

      const result = await InviteService.markInviteUsed('ABCDEF');

      expect(prisma.invite.update).toHaveBeenCalledWith({
        where: { inviteCode: 'ABCDEF' },
        data: { status: 'accepted' },
      });
      expect(result).toEqual(mockInvite);
    });
  });

  describe('getInviteStats', () => {
    it('should return correct invite statistics', async () => {
      const mockInvites = [
        { id: '1', status: 'pending', createdAt: new Date(), inviter: { email: 'user@test.com' } },
        { id: '2', status: 'accepted', createdAt: new Date(), inviter: { email: 'user@test.com' } },
        { id: '3', status: 'accepted', createdAt: new Date(), inviter: { email: 'user@test.com' } },
      ];

      (prisma.invite.findMany as jest.Mock).mockResolvedValue(mockInvites);

      const result = await InviteService.getInviteStats(1);

      expect(result.totalInvites).toBe(3);
      expect(result.acceptedInvites).toBe(2);
      expect(result.pendingInvites).toBe(1);
      expect(result.invites).toEqual(mockInvites);
    });
  });

  describe('getInviteLink', () => {
    it('should generate correct invite link', () => {
      const originalEnv = process.env.NEXTAUTH_URL;
      process.env.NEXTAUTH_URL = 'https://example.com';

      const link = InviteService.getInviteLink('ABCDEF');
      expect(link).toBe('https://example.com/invite/ABCDEF');

      process.env.NEXTAUTH_URL = originalEnv;
    });

    it('should use localhost fallback when NEXTAUTH_URL not set', () => {
      const originalEnv = process.env.NEXTAUTH_URL;
      delete process.env.NEXTAUTH_URL;

      const link = InviteService.getInviteLink('ABCDEF');
      expect(link).toBe('http://localhost:3000/invite/ABCDEF');

      process.env.NEXTAUTH_URL = originalEnv;
    });
  });
});