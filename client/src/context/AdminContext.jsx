import { createContext, useContext, useState, useCallback } from 'react';
import { verifyAdmin } from '../api/songs';

const AdminContext = createContext(null);

const STORAGE_KEY = 'songbook-admin-password';

export function AdminProvider({ children }) {
  // Admin control disabled — all actions available to everyone
  const [isAdmin] = useState(true);

  const login = useCallback(async () => true, []);
  const logout = useCallback(() => {}, []);

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
