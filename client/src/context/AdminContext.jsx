import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { verifyAdmin } from '../api/songs';

const AdminContext = createContext(null);

const STORAGE_KEY = 'songbook-admin-password';

export function AdminProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      verifyAdmin(saved)
        .then(ok => {
          if (ok) setIsAdmin(true);
          else localStorage.removeItem(STORAGE_KEY);
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

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
    <AdminContext.Provider value={{ isAdmin, checking, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
