'use client';

import { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/chat';
import type { Conversation } from '@/stores/chat';
import { format } from 'date-fns';
import { Search, Trash2, MessageSquare, Clock, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';


export function ConversationList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  
  const {
    conversations,
    activeConversation,
    loadConversations,
    deleteConversation,
    clearAllConversations,
    searchConversations,
  } = useChatStore();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const filteredConversations = searchQuery
    ? searchConversations(searchQuery)
    : conversations;

  const groupedConversations = () => {
    const groups: Record<string, Conversation[]> = {};
    
    filteredConversations.forEach(conv => {
      const date = new Date(conv.updatedAt);
      const today = new Date();
      
      let key: string;
      if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
        key = 'today';
      } else if (format(date, 'yyyy-MM-dd') === format(new Date(today.getTime() - 86400000), 'yyyy-MM-dd')) {
        key = 'yesterday';
      } else if (date.getTime() > today.getTime() - 7 * 86400000) {
        key = 'this-week';
      } else if (date.getTime() > today.getTime() - 30 * 86400000) {
        key = 'this-month';
      } else {
        key = format(date, 'yyyy-MM');
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(conv);
    });
    
    return Object.entries(groups).sort((a, b) => {
      const order = ['today', 'yesterday', 'this-week', 'this-month'];
      const aIndex = order.indexOf(a[0]);
      const bIndex = order.indexOf(b[0]);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      return new Date(b[1][0]?.updatedAt || 0).getTime() - new Date(a[1][0]?.updatedAt || 0).getTime();
    }).map(([key, conversations]) => {
      const displayKey = {
        'today': '今天',
        'yesterday': '昨天',
        'this-week': '本周',
        'this-month': '本月'
      }[key] || key;
      return [displayKey, conversations] as const;
    });
  };

  const handleDelete = async (id: number) => {
    setIsDeleting(id);
    try {
      await deleteConversation(id);
      setShowDeleteConfirm(null);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllConversations();
      setShowClearConfirm(false);
    } catch {
      // Error handled in store
    }
  };

  const formatLastMessage = (messages: Conversation['messages']) => {
    if (messages.length === 0) return '无消息';
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage.content;
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  };

  const getMessageCount = (messages: Conversation['messages']) => {
    return `${Math.ceil(messages.length / 2)} 轮对话`;
  };

  if (conversations.length === 0) {
    return (
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        <NavigationHeader title="对话历史" showBack={true} backHref="/" />
        
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 px-4">
          <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">暂无对话记录</h3>
          <p className="text-sm text-center mb-6 max-w-sm">
            开始一个对话，你的英语练习之旅将在这里记录
          </p>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>开始对话</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <NavigationHeader title="对话历史" showBack={true} backHref="/" />
      
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            {conversations.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
              >
                清空全部
              </button>
            )}
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索对话内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {groupedConversations().map(([group, conversations]) => (
            <div key={group}>
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 px-2">
                {group}
              </h2>
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <Link
                    key={conversation.id}
                    href={`/history/${conversation.id}`}
                    className={cn(
                      'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md block',
                      activeConversation?.id === conversation.id && 'ring-2 ring-blue-500'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {conversation.title || '无标题对话'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                          {formatLastMessage(conversation.messages)}
                        </p>
                        
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {format(new Date(conversation.updatedAt), 'MM-dd HH:mm')}
                          </span>
                          <span className="flex items-center">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            {getMessageCount(conversation.messages)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(conversation.id);
                          }}
                          disabled={isDeleting === conversation.id}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="删除对话"
                        >
                          {isDeleting === conversation.id ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                        
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearAll}
        title="清空所有对话"
        message={`确定要清空所有 ${conversations.length} 个对话吗？此操作不可撤销。`}
        confirmText="确认清空"
        type="danger"
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm !== null}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
        title="删除对话"
        message="确定要删除这个对话吗？此操作不可撤销。"
        confirmText="删除"
        type="danger"
      />
    </div>
  );
}