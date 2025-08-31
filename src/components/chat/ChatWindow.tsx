'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Bot, User, Loader2, History, LogOut } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { format } from 'date-fns';
import { useChatStore } from '@/stores/chat';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

// interface Message {
//   id: string;
//   content: string;
//   role: 'user' | 'assistant';
//   timestamp: Date;
// }

interface ChatWindowProps {
  _conversationId?: number;
  initialMessages?: Array<{ role: string; content: string; timestamp: string }>;
  isReadOnly?: boolean;
}

export function ChatWindow({ 
  _conversationId, 
  initialMessages, 
  isReadOnly = false 
}: ChatWindowProps) {
  useSession();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const {
    activeConversation,
    isLoading,
    error,
    sendMessage,
    loadConversations,
    createNewConversation,
  } = useChatStore();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const messages = useMemo(() => {
    if (initialMessages) {
      return initialMessages.map(msg => ({
        id: `${msg.timestamp}-${Math.random()}`,
        content: msg.content,
        role: msg.role,
        timestamp: new Date(msg.timestamp),
      }));
    }
    
    return activeConversation?.messages?.map(msg => ({
      id: `${msg.timestamp}-${Math.random()}`,
      content: msg.content,
      role: msg.role,
      timestamp: new Date(msg.timestamp),
    })) || [];
  }, [activeConversation?.messages, initialMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initializeChat = async () => {
      await loadConversations();
      
      // 如果是只读模式，不创建新对话
      if (isReadOnly) return;
      
      // 如果没有活跃对话，创建新对话
      if (!activeConversation && !initialMessages) {
        // 延迟创建，避免重复创建
        setTimeout(() => {
          createNewConversation();
        }, 100);
      }
    };
    
    initializeChat();
  }, [loadConversations, activeConversation, initialMessages, isReadOnly, createNewConversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    
    try {
      await sendMessage(message, activeConversation?.id);
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bot className="h-8 w-8 text-blue-500" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI 英语学习助手
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                随时为你提供英语学习支持
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/history"
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              title="查看历史对话"
            >
              <History className="w-5 h-5" />
            </Link>
            <Link
              href="/profile"
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              title="用户设置"
            >
              <User className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              title="退出登录"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                开始对话
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                输入你的英语问题，AI将为你提供帮助
              </p>
            </div>
          )}
          
          {messages.map((message) => (
            <div key={message.id} className="flex gap-4">
              <div
                className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                  message.role === 'assistant'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                )}
              >
                {message.role === 'assistant' ? (
                  <Bot className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3 max-w-full',
                    message.role === 'assistant'
                      ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                      : 'bg-blue-500 text-white ml-auto'
                  )}
                >
                  <div className="text-sm leading-relaxed">
                    <MarkdownRenderer content={message.content} />
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {format(message.timestamp, 'HH:mm')}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      AI正在思考中...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="text-center py-4">
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - only show if not read-only */}
      {!isReadOnly && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入你的英语问题..."
                  className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={1}
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 rounded-xl bg-blue-500 px-4 py-3 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </form>
            
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              按 Enter 发送消息，Shift+Enter 换行
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={() => signOut({ redirect: true, callbackUrl: '/login' })}
        title="退出登录"
        message="确定要退出当前账户吗？"
        confirmText="确认退出"
        type="warning"
      />
    </div>
  );
}