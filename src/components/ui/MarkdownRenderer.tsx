'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // 简单的markdown渲染实现
  const renderContent = (text: string) => {
    return text
      // 代码块
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto my-2"><code class="text-sm">$2</code></pre>')
      // 行内代码
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
      // 粗体
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>')
      // 斜体
      .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-500 hover:text-blue-600 underline" target="_blank" rel="noopener noreferrer">$1</a>')
      // 标题
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-3 mb-1">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
      // 列表
      .replace(/^\s*-\s(.+)$/gm, '<li class="ml-4">$1</li>')
      .replace(/(<li[^>]*>.*<\/li>\s*)+/g, '<ul class="list-disc list-inside my-2">$&</ul>')
      // 换行
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n/g, '<br>');
  };

  return (
    <div 
      className={`markdown-content ${className} prose prose-sm dark:prose-invert max-w-none`}
      dangerouslySetInnerHTML={{ __html: renderContent(content) }}
    />
  );
}