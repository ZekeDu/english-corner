import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

export interface InviteCode {
  code: string;
  inviterId: number;
  expiresAt?: Date;
}

export class InviteService {
  /**
   * 生成唯一邀请码
   */
  static generateInviteCode(length: number = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    const bytes = randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    
    return result;
  }

  /**
   * 创建新的邀请码
   */
  static async createInvite(inviterId: number, invitedEmail?: string) {
    const code = this.generateInviteCode();
    
    const invite = await db.invite.create({
      data: {
        inviterId,
        inviteCode: code,
        invitedEmail,
      },
    });

    return invite;
  }

  /**
   * 验证邀请码是否有效
   */
  static async validateInvite(code: string) {
    const invite = await db.invite.findUnique({
      where: { inviteCode: code },
      include: {
        inviter: {
          select: {
            id: true,
            email: true,
            nickname: true,
          },
        },
      },
    });

    if (!invite) {
      return { valid: false, message: '邀请码不存在' };
    }

    if (invite.status !== 'pending') {
      return { valid: false, message: '邀请码已被使用' };
    }

    return {
      valid: true,
      invite,
    };
  }

  /**
   * 使用邀请码注册后更新状态
   */
  static async markInviteUsed(code: string) {
    return await db.invite.update({
      where: { inviteCode: code },
      data: { status: 'accepted' },
    });
  }

  /**
   * 获取用户的邀请统计
   */
  static async getInviteStats(userId: number) {
    const invites = await db.invite.findMany({
      where: { inviterId: userId },
      include: {
        inviter: {
          select: {
            email: true,
            nickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalInvites = invites.length;
    const acceptedInvites = invites.filter(invite => invite.status === 'accepted').length;
    const pendingInvites = invites.filter(invite => invite.status === 'pending').length;

    return {
      totalInvites,
      acceptedInvites,
      pendingInvites,
      invites,
    };
  }

  /**
   * 获取邀请链接（完整URL）
   */
  static getInviteLink(code: string): string {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return `${baseUrl}/invite/${code}`;
  }
}