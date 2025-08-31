'use client';

import { useState } from 'react';
import { useMobileGestures } from '@/hooks/use-mobile-gestures';
import { Trash2, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableConversationItemProps {
  conversation: {
    id: number;
    title: string;
    messages: Array<{ content: string }>;
    updatedAt: string;
  };
  onDelete: (id: number) => void;
  onArchive?: (id: number) => void;
  onClick: (id: number) => void;
}

export function SwipeableConversationItem({
  conversation,
  onDelete,
  onArchive,
  onClick
}: SwipeableConversationItemProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  
  const { attachRef, touchHandlers } = useMobileGestures({
    onSwipeLeft: () => {
      setOffsetX(-80);
    },
    onSwipeRight: () => {
      setOffsetX(80);
    },
    threshold: 60,
  });

  const handleTouchEnd = () => {
    setIsSwiping(false);
    
    if (Math.abs(offsetX) > 60) {
      if (offsetX < 0) {
        onDelete(conversation.id);
      } else if (offsetX > 0 && onArchive) {
        onArchive(conversation.id);
      }
    }
    
    setOffsetX(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background actions */}
      <div className="absolute inset-0 flex items-center">
        <div className="absolute left-0 top-0 bottom-0 flex items-center bg-green-500 text-white px-4"
          style={{ width: `${Math.max(0, offsetX)}px` }}
        >
          <Archive className="w-5 h-5" />
          <span className="ml-2 text-sm font-medium">归档</span>
        </div>
        
        <div className="absolute right-0 top-0 bottom-0 flex items-center bg-red-500 text-white px-4"
          style={{ width: `${Math.max(0, -offsetX)}px` }}
        >
          <Trash2 className="w-5 h-5" />
          <span className="ml-2 text-sm font-medium">删除</span>
        </div>
      </div>

      {/* Content */}
      <div
        ref={attachRef}
        {...touchHandlers}
        className={cn(
          'relative bg-white dark:bg-gray-800 rounded-lg p-4 cursor-pointer transition-transform duration-200',
          'border border-gray-200 dark:border-gray-700',
          isSwiping && 'shadow-lg'
        )}
        style={{ transform: `translateX(${offsetX}px)` }}
        onClick={() => onClick(conversation.id)}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {conversation.title || '无标题对话'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
              {conversation.messages[conversation.messages.length - 1]?.content || '无消息'}
            </p>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400 ml-4">
            {new Date(conversation.updatedAt).toLocaleDateString('zh-CN', {
              month: 'short',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>
    </div>
  );
}