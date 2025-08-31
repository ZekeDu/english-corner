'use client';

import { useState, useEffect } from 'react';
import { X, Share2, MessageCircle, Mail, Download } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteLink: string;
  inviteCode: string;
}

export function ShareModal({ isOpen, onClose, inviteLink, inviteCode }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (inviteLink) {
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}`);
    }
  }, [inviteLink]);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const shareVia = (platform: string) => {
    const text = `快来加入英语角，和我一起用AI提升英语能力！\n\n邀请码：${inviteCode}\n链接：${inviteLink}`;
    
    switch (platform) {
      case 'wechat':
        // 微信分享通常需要微信SDK，这里提供文本复制
        copyToClipboard(text);
        break;
      case 'weibo':
        const weiboUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(inviteLink)}&title=${encodeURIComponent(text)}`;
        window.open(weiboUrl, '_blank', 'width=600,height=400');
        break;
      case 'qq':
        const qqUrl = `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(inviteLink)}&title=${encodeURIComponent('英语角邀请')}&summary=${encodeURIComponent(text)}`;
        window.open(qqUrl, '_blank', 'width=600,height=400');
        break;
      case 'email':
        const emailUrl = `mailto:?subject=${encodeURIComponent('英语角邀请')}&body=${encodeURIComponent(text)}`;
        window.location.href = emailUrl;
        break;
    }
  };

  const downloadQRCode = () => {
    if (!qrUrl) return;
    
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `invite-${inviteCode}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">分享邀请</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 邀请信息 */}
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{inviteCode}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">邀请码</p>
          </div>

          {/* 分享链接 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">邀请链接</label>
            <div className="flex space-x-2">
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
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          </div>

          {/* 二维码 */}
          {qrUrl && (
            <div className="text-center">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">二维码</label>
              <div className="flex justify-center">
                <img src={qrUrl} alt="邀请二维码" className="w-32 h-32" />
              </div>
              <button
                onClick={downloadQRCode}
                className="mt-2 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors flex items-center mx-auto"
              >
                <Download className="w-3 h-3 mr-1" />
                下载二维码
              </button>
            </div>
          )}

          {/* 快速分享 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">快速分享</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => shareVia('wechat')}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>微信</span>
              </button>
              
              <button
                onClick={() => shareVia('weibo')}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>微博</span>
              </button>
              
              <button
                onClick={() => shareVia('qq')}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>QQ</span>
              </button>
              
              <button
                onClick={() => shareVia('email')}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>邮件</span>
              </button>
            </div>
          </div>

          {/* 分享文本预览 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">分享内容</label>
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400">
              快来加入英语角，和我一起用AI提升英语能力！
              邀请码：{inviteCode}
              链接：{inviteLink}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}