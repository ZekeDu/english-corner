import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '@/lib/db';
import { InviteService } from '@/lib/invite';

describe('Invite Integration Tests', () => {
  let testUser: any;
  let testInvite: any;

  beforeEach(async () => {
    // 清理测试数据
    await prisma.invite.deleteMany({});
    await prisma.user.deleteMany({});

    // 创建测试用户
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        nickname: 'Test User',
      },
    });
  });

  afterEach(async () => {
    await prisma.invite.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('完整邀请流程', () => {
    it('应该创建邀请码、验证邀请码、完成注册', async () => {
      // 1. 创建邀请码
      const invite = await InviteService.createInvite(testUser.id, 'invited@example.com');
      expect(invite.inviteCode).toBeDefined();
      expect(invite.status).toBe('pending');

      // 2. 验证邀请码
      const validation = await InviteService.validateInvite(invite.inviteCode);
      expect(validation.valid).toBe(true);
      expect(validation.invite?.inviter.email).toBe('test@example.com');

      // 3. 使用邀请码注册新用户
      const newUser = await prisma.user.create({
        data: {
          email: 'invited@example.com',
          passwordHash: 'newhashedpassword',
          nickname: 'Invited User',
        },
      });

      // 4. 标记邀请为已使用
      await InviteService.markInviteUsed(invite.inviteCode);

      // 5. 验证邀请状态
      const updatedInvite = await prisma.invite.findUnique({
        where: { id: invite.id },
      });
      expect(updatedInvite?.status).toBe('accepted');

      // 6. 验证邀请统计
      const stats = await InviteService.getInviteStats(testUser.id);
      expect(stats.totalInvites).toBe(1);
      expect(stats.acceptedInvites).toBe(1);
      expect(stats.pendingInvites).toBe(0);
    });

    it('应该正确处理无效的邀请码', async () => {
      const validation = await InviteService.validateInvite('INVALIDCODE');
      expect(validation.valid).toBe(false);
      expect(validation.message).toBe('邀请码不存在');
    });

    it('应该正确处理已使用的邀请码', async () => {
      const invite = await InviteService.createInvite(testUser.id);
      await InviteService.markInviteUsed(invite.inviteCode);

      const validation = await InviteService.validateInvite(invite.inviteCode);
      expect(validation.valid).toBe(false);
      expect(validation.message).toBe('邀请码已被使用');
    });

    it('应该正确生成邀请链接', async () => {
      const invite = await InviteService.createInvite(testUser.id);
      const link = InviteService.getInviteLink(invite.inviteCode);
      expect(link).toContain(`/invite/${invite.inviteCode}`);
    });
  });

  describe('邀请统计', () => {
    it('应该正确统计邀请数据', async () => {
      // 创建多个邀请
      const invite1 = await InviteService.createInvite(testUser.id, 'user1@example.com');
      const invite2 = await InviteService.createInvite(testUser.id, 'user2@example.com');
      const invite3 = await InviteService.createInvite(testUser.id);

      // 接受部分邀请
      await InviteService.markInviteUsed(invite1.inviteCode);
      await InviteService.markInviteUsed(invite2.inviteCode);

      const stats = await InviteService.getInviteStats(testUser.id);
      expect(stats.totalInvites).toBe(3);
      expect(stats.acceptedInvites).toBe(2);
      expect(stats.pendingInvites).toBe(1);
    });
  });

  describe('邀请码唯一性', () => {
    it('应该生成唯一的邀请码', async () => {
      const invites = [];
      for (let i = 0; i < 10; i++) {
        const invite = await InviteService.createInvite(testUser.id);
        invites.push(invite.inviteCode);
      }

      const uniqueCodes = new Set(invites);
      expect(uniqueCodes.size).toBe(invites.length);
    });
  });
});