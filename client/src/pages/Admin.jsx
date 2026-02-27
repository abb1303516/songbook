import { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { verifyAdmin } from '../api/songs';
import { useSettings } from '../context/SettingsContext';

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const { settings } = useSettings();
  const { colors } = settings;

  // Check if already authenticated
  useEffect(() => {
    const saved = localStorage.getItem('songbook-admin-password');
    if (saved) {
      verifyAdmin(saved).then(ok => {
        if (ok) setAuthenticated(true);
        else localStorage.removeItem('songbook-admin-password');
      }).finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const ok = await verifyAdmin(password);
    if (ok) {
      localStorage.setItem('songbook-admin-password', password);
      setAuthenticated(true);
    } else {
      setError('Неверный пароль');
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
        Проверка...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg, color: colors.text }}>
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

  return <Outlet />;
}

export function AdminDashboard() {
  const { settings } = useSettings();
  const { colors } = settings;

  const links = [
    { to: '/admin/songs/new', label: 'Добавить песню', icon: '+' },
    { to: '/admin/setlists/new', label: 'Создать сет-лист', icon: '+' },
    { to: '/admin/import', label: 'Импорт ChordPro', icon: '↓' },
    { to: '/api/export', label: 'Экспорт коллекции', icon: '↑', external: true },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg, color: colors.text }}>
      <header
        className="px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}
      >
        <Link to="/" className="p-1" style={{ color: colors.textMuted }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <h1 className="text-lg font-semibold">Админка</h1>
      </header>

      <div className="p-4 space-y-3 max-w-lg mx-auto">
        {links.map(({ to, label, icon, external }) =>
          external ? (
            <a
              key={to}
              href={to}
              className="block px-4 py-3 rounded-lg text-sm font-medium"
              style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
            >
              <span className="mr-2">{icon}</span> {label}
            </a>
          ) : (
            <Link
              key={to}
              to={to}
              className="block px-4 py-3 rounded-lg text-sm font-medium"
              style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
            >
              <span className="mr-2">{icon}</span> {label}
            </Link>
          )
        )}

        <div className="pt-4">
          <button
            onClick={() => {
              localStorage.removeItem('songbook-admin-password');
              window.location.href = '/';
            }}
            className="text-sm"
            style={{ color: colors.textMuted }}
          >
            Выйти из админки
          </button>
        </div>
      </div>
    </div>
  );
}
