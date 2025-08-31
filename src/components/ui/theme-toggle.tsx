'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/components/providers/theme-provider';
import { cn } from '@/lib/utils';

const themes = [
  {
    value: 'light' as const,
    label: '浅色',
    icon: Sun,
  },
  {
    value: 'dark' as const,
    label: '深色',
    icon: Moon,
  },
  {
    value: 'system' as const,
    label: '系统',
    icon: Monitor,
  },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={cn('flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1', className)}>
      {themes.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex items-center space-x-2 px-3 py-1.5 text-sm rounded-md transition-colors',
            theme === value
              ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          )}
          title={label}
        >
          <Icon className="w-4 h-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function ThemeToggleSimple() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const themes = ['light', 'dark', 'system'] as const;
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={`切换到${theme === 'dark' ? '浅色' : theme === 'light' ? '深色' : '系统'}主题`}
    >
      <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
    </button>
  );
}