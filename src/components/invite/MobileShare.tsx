'use client';

import { useState, useEffect } from 'react';

interface MobileShareProps {
  inviteLink: string;
  inviteCode: string;
  onClose: () => void;
}

export function MobileShare({ inviteLink, inviteCode, onClose }: MobileShareProps) {
  const [_isIOS, setIsIOS] = useState(false);
  const [_isAndroid, setIsAndroid] = useState(false);
  const [qrImage, setQrImage] = useState('');

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));
    
    // 生成二维码
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}`;
    setQrImage(qrUrl);
  }, [inviteLink]);

  const handleNativeShare = async () => {
    const shareData = {
      title: '英语角 - AI英语学习应用',
      text: `快来加入英语角，和我一起用AI提升英语能力！\n\n邀请码：${inviteCode}\n链接：${inviteLink}`,
      url: inviteLink,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareData.text);
        alert('已复制到剪贴板');
      }
    } catch (error) {
      console.error('分享失败:', error);
      await navigator.clipboard.writeText(shareData.text);
      alert('已复制到剪贴板');
    }
  };

  const handleWeChat = () => {
    // 微信分享方案
    const text = `英语角邀请\n邀请码：${inviteCode}\n${inviteLink}`;
    navigator.clipboard.writeText(text);
    alert('已复制邀请信息，请粘贴到微信分享');
  };

  const handleSMS = () => {
    const text = `快来加入英语角！邀请码：${inviteCode} 链接：${inviteLink}`;
    const smsUrl = `sms:?body=${encodeURIComponent(text)}`;
    window.location.href = smsUrl;
  };

  const handleSaveQR = async () => {
    if (!qrImage) return;

    try {
      const response = await fetch(qrImage);
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
      console.error('保存二维码失败:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
      <div className="bg-white dark:bg-gray-800 w-full rounded-t-2xl p-4 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">分享邀请</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* 邀请码展示 */}
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{inviteCode}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">邀请码</div>
          </div>

          {/* 二维码 */}
          {qrImage && (
            <div className="flex justify-center">
              <img src={qrImage} alt="邀请二维码" className="w-40 h-40 rounded-lg" />
            </div>
          )}

          {/* 分享选项 */}
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={handleNativeShare}
              className="flex flex-col items-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.632 4.316C18.114 15.562 18 16.018 18 16.5c0 .482.114.938.316 1.342m0-2.684a3 3 0 110 2.684M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs">分享</span>
            </button>

            <button
              onClick={handleWeChat}
              className="flex flex-col items-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
            >
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.486 2 2 6.03 2 11.005c0 2.624 1.204 4.99 3.19 6.696L4 22l4.694-2.013C10.06 20.631 11 21 12 21c5.514 0 10-4.02 10-8.995C22 6.03 17.514 2 12 2z" />
              </svg>
              <span className="text-xs">微信</span>
            </button>

            <button
              onClick={handleSMS}
              className="flex flex-col items-center p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-xs">短信</span>
            </button>

            <button
              onClick={handleSaveQR}
              className="flex flex-col items-center p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs">保存</span>
            </button>
          </div>

          {/* 复制链接 */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(inviteLink);
              alert('邀请链接已复制');
            }}
            className="w-full py-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-medium"
          >
            复制邀请链接
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}