'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Gift, Share2, Copy, Download } from 'lucide-react';
import { MobileShare } from './MobileShare';

interface InviteStats {
  totalInvites: number;
  acceptedInvites: number;
  pendingInvites: number;
  invites: Array<{
    id: string;
    inviteCode: string;
    status: string;
    createdAt: string;
    invitedEmail?: string;
  }>;
}

export function InviteSection() {
  useSession();
  const [inviteLink, setInviteLink] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadInviteStats();
  }, []);

  const loadInviteStats = async () => {
    try {
      const response = await fetch('/api/invite/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('加载邀请统计失败:', error);
    }
  };

  const generateInvite = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/invite/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInviteCode(data.invite.code);
        setInviteLink(data.invite.link);
        await loadInviteStats();
      }
    } catch (error) {
      console.error('生成邀请码失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const [showMobileShare, setShowMobileShare] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const shareNative = async () => {
    if (!inviteLink) return;

    if (isMobile) {
      setShowMobileShare(true);
      return;
    }

    const shareData = {
      title: '英语角 - AI英语学习应用',
      text: `快来加入英语角，和我一起用AI提升英语能力！\n\n邀请码：${inviteCode}\n链接：${inviteLink}`,
      url: inviteLink,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        copyToClipboard(inviteLink);
      }
    } catch (error) {
      console.error('分享失败:', error);
      copyToClipboard(inviteLink);
    }
  };

  const downloadQRCode = async () => {
    if (!inviteLink) return;

    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(inviteLink)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invite-${inviteCode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载二维码失败:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Gift className="w-5 h-5 mr-2 text-blue-600" />
            邀请好友
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            邀请朋友加入英语角，一起提升英语能力
          </p>
        </div>
        <button
          onClick={generateInvite}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center"
        >
          <Share2 className="w-4 h-4 mr-2" />
          {loading ? '生成中...' : '生成邀请码'}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalInvites}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">总邀请</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.acceptedInvites}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">已接受</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.pendingInvites}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">待接受</div>
          </div>
        </div>
      )}

      {inviteLink && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">邀请码：</span>
              <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{inviteCode}</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
              />
              <button
                onClick={() => copyToClipboard(inviteLink)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            {copied && <span className="text-sm text-green-600">已复制！</span>}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={shareNative}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              立即分享
            </button>
            <button
              onClick={downloadQRCode}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              二维码
            </button>
          </div>
        </div>
      )}

      {stats?.invites && stats.invites.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">邀请历史</h4>
          <div className="space-y-2">
            {stats.invites.slice(0, 5).map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="text-sm font-medium">{invite.inviteCode}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(invite.createdAt).toLocaleDateString()}
                    {invite.invitedEmail && ` • ${invite.invitedEmail}`}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  invite.status === 'accepted' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                }`}>
                  {invite.status === 'accepted' ? '已接受' : '待接受'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showMobileShare && (
        <MobileShare
          inviteLink={inviteLink}
          inviteCode={inviteCode}
          onClose={() => setShowMobileShare(false)}
        />
      )}
    </div>
  );
}