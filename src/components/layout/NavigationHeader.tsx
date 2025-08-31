'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { ArrowLeft, LogOut, MessageSquare, History } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface NavigationHeaderProps {
  title: string;
  showBack?: boolean;
  showLogout?: boolean;
  backHref?: string;
}

export function NavigationHeader({ 
  title, 
  showBack = true, 
  showLogout = false,
  backHref = "/"
}: NavigationHeaderProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {showBack && (
              <Link
                href={backHref}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="返回对话"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/"
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              title="返回对话"
            >
              <MessageSquare className="w-5 h-5" />
            </Link>
            
            <Link
              href="/history"
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              title="历史对话"
            >
              <History className="w-5 h-5" />
            </Link>

            {showLogout && (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                title="退出登录"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="退出登录"
        message="确定要退出当前账户吗？"
        confirmText="确认退出"
        type="warning"
      />
    </>
  );
}