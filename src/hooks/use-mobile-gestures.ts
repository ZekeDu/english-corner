import { useState, useRef, useEffect } from 'react';

interface GestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  threshold?: number;
  longPressDelay?: number;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  isPressed: boolean;
}

export function useMobileGestures(config: GestureConfig) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    threshold = 50,
    longPressDelay = 500
  } = config;

  const [touchState, setTouchState] = useState<TouchState | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const elementRef = useRef<HTMLElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const newTouchState: TouchState = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      isPressed: true
    };

    setTouchState(newTouchState);

    // 设置长按定时器
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        if (touchState?.isPressed) {
          onLongPress();
        }
      }, longPressDelay);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchState) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchState.startX;
    const deltaY = touch.clientY - touchState.startY;

    // 如果移动超过阈值，取消长按
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchState) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchState.startX;
    const deltaY = touch.clientY - touchState.startY;
    const _deltaTime = Date.now() - touchState.startTime;

    // 清理长按定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // 检查是否为滑动
    if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // 水平滑动
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      } else {
        // 垂直滑动
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }

    setTouchState(null);
  };

  const attachRef = (element: HTMLElement | null) => {
    elementRef.current = element;
  };

  return {
    attachRef,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    }
  };
}

// 移动端键盘管理hook
export function useKeyboardManager() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const keyboardHeight = Math.max(0, windowHeight - viewportHeight);
      
      setKeyboardHeight(keyboardHeight);
      setIsKeyboardOpen(keyboardHeight > 100);
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return {
    keyboardHeight,
    isKeyboardOpen,
  };
}

// 响应式断点hook
export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkResponsive = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setIsDesktop(width >= 1024);
    };

    checkResponsive();
    window.addEventListener('resize', checkResponsive);

    return () => window.removeEventListener('resize', checkResponsive);
  }, []);

  return { isMobile, isTablet, isDesktop };
}

// 触摸反馈hook
export function useTouchFeedback() {
  const [isPressed, setIsPressed] = useState(false);

  const handleTouchStart = () => {
    setIsPressed(true);
    
    // 震动反馈（如果支持）
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  return {
    isPressed,
    touchFeedback: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
    }
  };
}