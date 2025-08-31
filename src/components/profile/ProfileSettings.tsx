'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { User, Bell, Download, Shield, Trash2, Gift, Key } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InviteSection } from '@/components/invite/InviteSection';
import { ApiSettings } from '@/components/settings/ApiSettings';

export function ProfileSettings() {
  const { data: session } = useSession();
  const [_isLoading, _setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');

  const sections = [
    {
      id: 'profile',
      title: '个人资料',
      icon: User,
      description: '更新你的基本信息'
    },
    {
      id: 'invite',
      title: '邀请好友',
      icon: Gift,
      description: '邀请朋友加入英语角'
    },
    {
      id: 'account',
      title: '账户安全',
      icon: Shield,
      description: '管理密码和安全设置'
    },
    {
      id: 'preferences',
      title: '偏好设置',
      icon: Bell,
      description: '自定义应用体验'
    },
    {
      id: 'api',
      title: 'API配置',
      icon: Key,
      description: '配置您的大模型API'
    },
    {
      id: 'data',
      title: '数据管理',
      icon: Download,
      description: '导出或删除你的数据'
    }
  ];

  const ProfileSection = () => {
    const [nickname, setNickname] = useState(session?.user?.name || '');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const { update: updateSession } = useSession();

    const handleSave = async () => {
      if (!nickname.trim()) {
        setMessage('昵称不能为空');
        return;
      }

      setIsLoading(true);
      setMessage('');

      try {
        const response = await fetch('/api/users/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nickname: nickname.trim() }),
        });

        const data = await response.json();

        if (data.success) {
          setMessage('昵称更新成功');
          // 立即更新会话数据
          await updateSession({
            ...session,
            user: {
              ...session?.user,
              name: data.user.nickname,
            }
          });
          setTimeout(() => setMessage(''), 2000);
        } else {
          setMessage(data.error || '更新失败');
        }
      } catch (error) {
        setMessage('网络错误，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">个人资料</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入你的昵称"
              maxLength={50}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              邮箱
            </label>
            <input
              type="email"
              value={session?.user?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">邮箱地址不可修改</p>
          </div>
          
          {message && (
            <div className={`text-sm ${message.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </div>
          )}
          
          <div>
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading || !nickname.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '保存中...' : '保存更改'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const AccountSection = () => {
    const [formData, setFormData] = useState({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">密码修改</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              当前密码
            </label>
            <input
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
              placeholder="输入当前密码"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              新密码
            </label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
              placeholder="输入新密码"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              确认密码
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700"
              placeholder="再次输入新密码"
            />
          </div>
          
          <div>
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={false}
            >
              修改密码
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PreferencesSection = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">偏好设置</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            深色模式
          </label>
          <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <span className="translate-x-0 inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out" />
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            消息通知
          </label>
          <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-blue-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out" />
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            自动保存
          </label>
          <button className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-blue-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out" />
          </button>
        </div>
      </div>
    </div>
  );

  const DataSection = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">数据管理</h3>
      
      <div className="space-y-4">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">导出数据</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            下载你的对话历史和账户信息的JSON文件
          </p>
          <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={() => alert('数据导出功能开发中')}
          >
            导出数据
          </button>
        </div>
        
        <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/10">
          <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">删除账户</h4>
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
            永久删除你的账户和所有相关数据，此操作不可撤销
          </p>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
            onClick={() => {
              if (confirm('确定要删除账户吗？此操作不可撤销。')) {
                alert('账户删除功能开发中');
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
            <span>删除账户</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSection />;
      case 'invite':
        return <InviteSection />;
      case 'api':
        return <ApiSettings />;
      case 'account':
        return <AccountSection />;
      case 'preferences':
        return <PreferencesSection />;
      case 'data':
        return <DataSection />;
      default:
        return <ProfileSection />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2">
            <div className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors',
                      activeSection === section.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <div className="text-left">
                      <div className="font-medium">{section.title}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{section.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}