import { useState } from 'react';
import { Link, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useAdmin } from '../context/AdminContext';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { settings } = useSettings();
  const { colors } = settings;
  const { isAdmin, checking, login } = useAdmin();
  const location = useLocation();

  const isIndexRoute = location.pathname === '/admin' || location.pathname === '/admin/';

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
        Проверка...
      </div>
    );
  }

  // Logged in on /admin index → redirect to catalog
  if (isAdmin && isIndexRoute) {
    return <Navigate to="/" replace />;
  }

  // Not logged in → show login form
  if (!isAdmin) {
    const handleLogin = async (e) => {
      e.preventDefault();
      setError('');
      const ok = await login(password);
      if (ok) {
        // Will re-render: if on index, Navigate kicks in; if on child route, Outlet renders
      } else {
        setError('Неверный пароль');
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ backgroundColor: colors.bg, color: colors.text }}>
        <form onSubmit={handleLogin} className="w-72 space-y-4">
          <h1 className="text-xl font-bold text-center">Админка</h1>
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 rounded-lg outline-none"
            style={{ backgroundColor: colors.surface, color: colors.text, border: `1px solid ${colors.border}` }}
          />
          {error && <p className="text-sm text-center" style={{ color: '#e05555' }}>{error}</p>}
          <button
            type="submit"
            className="w-full py-2 rounded-lg font-medium"
            style={{ backgroundColor: colors.chords, color: colors.bg }}
          >
            Войти
          </button>
          <Link to="/" className="block text-center text-sm" style={{ color: colors.textMuted }}>
            Назад
          </Link>
        </form>
      </div>
    );
  }

  // Logged in + child route → render editor/import
  return <Outlet />;
}
