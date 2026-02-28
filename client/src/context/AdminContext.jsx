import { createContext, useContext, useState, useCallback } from 'react';
import { verifyAdmin } from '../api/songs';

const AdminContext = createContext(null);

const STORAGE_KEY = 'songbook-admin-password';

export function AdminProvider({ children }) {
  // If password exists in localStorage, trust it immediately — no API check
  const [isAdmin, setIsAdmin] = useState(() => !!localStorage.getItem(STORAGE_KEY));

  const login = useCallback(async (password) => {
    const ok = await verifyAdmin(password);
    if (ok) {
      localStorage.setItem(STORAGE_KEY, password);
      setIsAdmin(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAdmin(false);
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin, checking: false, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
