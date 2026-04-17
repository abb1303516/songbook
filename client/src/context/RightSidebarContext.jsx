import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const RightSidebarContext = createContext(null);
const STORAGE_KEY = 'songbook-right-sidebar';
const WIDTH_KEY = 'songbook-right-sidebar-width';

export const DEFAULT_RIGHT_WIDTH = 280;
export const MIN_RIGHT_WIDTH = 200;
export const MAX_RIGHT_WIDTH = 500;

export function RightSidebarProvider({ children }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isOpen, setIsOpen] = useState(() => {
    if (window.innerWidth < 768) return false;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'true'; // default closed on desktop too
  });
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(WIDTH_KEY);
    const n = saved ? parseInt(saved, 10) : DEFAULT_RIGHT_WIDTH;
    return Math.min(Math.max(n || DEFAULT_RIGHT_WIDTH, MIN_RIGHT_WIDTH), MAX_RIGHT_WIDTH);
  });

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e) => {
      setIsMobile(!e.matches);
      if (!e.matches) setIsOpen(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (!isMobile) localStorage.setItem(STORAGE_KEY, String(isOpen));
  }, [isOpen, isMobile]);

  useEffect(() => {
    localStorage.setItem(WIDTH_KEY, String(width));
  }, [width]);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <RightSidebarContext.Provider value={{ isOpen, isMobile, toggle, close, width, setWidth }}>
      {children}
    </RightSidebarContext.Provider>
  );
}

export function useRightSidebar() {
  const ctx = useContext(RightSidebarContext);
  if (!ctx) throw new Error('useRightSidebar must be used within RightSidebarProvider');
  return ctx;
}
