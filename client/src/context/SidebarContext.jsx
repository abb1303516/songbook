import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SidebarContext = createContext(null);
const STORAGE_KEY = 'songbook-sidebar';

export function SidebarProvider({ children }) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isOpen, setIsOpen] = useState(() => {
    if (window.innerWidth < 768) return false;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  // Track viewport changes
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e) => {
      setIsMobile(!e.matches);
      if (!e.matches) setIsOpen(false); // close on switch to mobile
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Persist desktop state
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem(STORAGE_KEY, String(isOpen));
    }
  }, [isOpen, isMobile]);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <SidebarContext.Provider value={{ isOpen, isMobile, toggle, close }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
