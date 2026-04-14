import { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HexColorPicker } from 'react-colorful';
import { useSidebar } from '../context/SidebarContext';
import { useSongs } from '../context/SongsContext';
import { useSongControls } from '../context/SongControlsContext';
import { useSettings } from '../context/SettingsContext';
import { useAdmin } from '../context/AdminContext';
import { THEMES } from '../hooks/useLocalSettings';

export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_COLLAPSED = 48;

const STATUS_LABELS = { all: 'Все', new: 'Новые', learning: 'Учу', known: 'Знаю' };
const THEME_LABELS = { dark: 'Тёмная', light: 'Светлая', contrast: 'Контрастная', warm: 'Тёплая' };
const COLOR_LABELS = [
  { key: 'text', label: 'Текст' },
  { key: 'chords', label: 'Аккорды' },
  { key: 'bg', label: 'Фон' },
  { key: 'chorusBg', label: 'Фон припева' },
];

// --- Icons as small components ---
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconMusic = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
  </svg>
);
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const IconList = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);
const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
  </svg>
);
const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export default function Sidebar() {
  const { isOpen, isMobile, toggle, close } = useSidebar();
  const { songs, setlists } = useSongs();
  const { controls } = useSongControls();
  const { settings, updateSettings, applyTheme } = useSettings();
  const { isAdmin } = useAdmin();
  const { colors } = settings;
  const location = useLocation();
  const navigate = useNavigate();

  // Sidebar local state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [artistsOpen, setArtistsOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [setlistsOpen, setSetlistsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);
  const [activeColor, setActiveColor] = useState(null);
  const [songControlsOpen, setSongControlsOpen] = useState(true);

  const artists = useMemo(() => {
    const map = {};
    songs.forEach(s => {
      const a = s.artist || 'Без исполнителя';
      map[a] = (map[a] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [songs]);

  const applyFilter = (type, value) => {
    const params = new URLSearchParams(location.search);
    if (type === 'status') {
      setStatusFilter(value);
      if (value === 'all') params.delete('status');
      else params.set('status', value);
    }
    if (type === 'artist') {
      setSelectedArtist(prev => {
        const next = prev === value ? null : value;
        if (next) params.set('artist', next);
        else params.delete('artist');
        return next;
      });
    }
    if (type === 'search') {
      setSearchQuery(value);
      if (value) params.set('q', value);
      else params.delete('q');
    }
    const qs = params.toString();
    navigate(`/${qs ? '?' + qs : ''}`, { replace: true });
    if (isMobile) close();
  };

  const handleNavClick = () => {
    if (isMobile) close();
  };

  const iconBtn = (title, icon, onClick) => (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center py-2.5"
      style={{ color: colors.textMuted }}
      title={title}
    >
      {icon}
    </button>
  );

  // ─── Collapsed sidebar (icon strip) ───
  if (!isOpen) {
    return (
      <aside
        className="fixed top-0 left-0 h-screen flex flex-col z-40"
        style={{
          width: SIDEBAR_COLLAPSED,
          backgroundColor: colors.surface,
          borderRight: `1px solid ${colors.border}`,
        }}
      >
        {iconBtn('Открыть меню', <IconMenu />, toggle)}
        <div style={{ borderBottom: `1px solid ${colors.border}` }} />
        {iconBtn('Все песни', <IconMusic />, () => { navigate('/'); })}
        {iconBtn('Исполнители', <IconUsers />, () => { toggle(); setArtistsOpen(true); })}
        {iconBtn('Сет-листы', <IconList />, () => { toggle(); setSetlistsOpen(true); })}
        {isAdmin && iconBtn('Добавить песню', <IconPlus />, () => { navigate('/admin/songs/new'); })}
        {iconBtn('Настройки', <IconSettings />, () => { toggle(); setSettingsOpen(true); })}
      </aside>
    );
  }

  // ─── Full sidebar ───
  return (
    <aside
      className="fixed top-0 left-0 h-screen flex flex-col z-40 overflow-hidden"
      style={{
        width: SIDEBAR_WIDTH,
        backgroundColor: colors.surface,
        borderRight: `1px solid ${colors.border}`,
        transition: isMobile ? 'transform 0.2s ease' : 'none',
        transform: isMobile && !isOpen ? `translateX(-${SIDEBAR_WIDTH}px)` : 'translateX(0)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <Link to="/" onClick={handleNavClick} className="font-bold text-lg" style={{ color: colors.text }}>
          AB Songbook
        </Link>
        <button onClick={toggle} className="p-1 rounded" style={{ color: colors.textMuted }} title="Свернуть">
          <IconChevronLeft />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Search */}
        <div className="px-3 py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
          {searchOpen ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => applyFilter('search', e.target.value)}
                placeholder="Поиск..."
                autoFocus
                className="flex-1 px-2 py-1 rounded text-sm outline-none min-w-0"
                style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
              />
              <button onClick={() => { setSearchOpen(false); applyFilter('search', ''); }} style={{ color: colors.textMuted }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 w-full px-2 py-1 rounded text-sm"
              style={{ color: colors.textMuted }}
            >
              <IconSearch />
              Поиск
            </button>
          )}
        </div>

        {/* All songs */}
        <div className="px-3 py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <Link
            to="/"
            onClick={() => { setStatusFilter('all'); setSelectedArtist(null); setSearchQuery(''); setSearchOpen(false); handleNavClick(); }}
            className="flex items-center justify-between w-full text-sm font-medium"
            style={{ color: location.pathname === '/' ? colors.chords : colors.text }}
          >
            <span>Все песни</span>
            <span style={{ color: colors.textMuted }}>{songs.length}</span>
          </Link>
        </div>

        {/* Status filter */}
        <div className="px-3 py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <div className="text-xs font-semibold mb-1.5" style={{ color: colors.textMuted }}>Статус</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => applyFilter('status', key)}
                className="px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
                style={{
                  backgroundColor: statusFilter === key ? colors.chords : 'transparent',
                  color: statusFilter === key ? colors.bg : colors.textMuted,
                  border: `1px solid ${statusFilter === key ? colors.chords : colors.border}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Artists */}
        <div className="px-3 py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <button
            onClick={() => setArtistsOpen(!artistsOpen)}
            className="flex items-center justify-between w-full text-sm font-medium"
            style={{ color: colors.text }}
          >
            <span>Исполнители</span>
            <IconChevronRight />
          </button>
          {artistsOpen && (
            <div className="mt-1.5 space-y-0.5 max-h-48 overflow-y-auto">
              {artists.map(([name, count]) => (
                <button
                  key={name}
                  onClick={() => applyFilter('artist', name)}
                  className="flex items-center justify-between w-full px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: selectedArtist === name ? colors.chords : 'transparent',
                    color: selectedArtist === name ? colors.bg : colors.textMuted,
                  }}
                >
                  <span className="truncate">{name}</span>
                  <span>{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Setlists */}
        <div className="px-3 py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <button
            onClick={() => setSetlistsOpen(!setlistsOpen)}
            className="flex items-center justify-between w-full text-sm font-medium"
            style={{ color: colors.text }}
          >
            <span>Сет-листы</span>
            <IconChevronRight />
          </button>
          {setlistsOpen && (
            <div className="mt-1.5 space-y-0.5 max-h-48 overflow-y-auto">
              {setlists.map(sl => (
                <Link
                  key={sl.id}
                  to={`/setlist/${sl.id}`}
                  onClick={handleNavClick}
                  className="flex items-center justify-between w-full px-2 py-1 rounded text-xs"
                  style={{ color: colors.textMuted }}
                >
                  <span className="truncate">{sl.name}</span>
                  <span>{sl.song_ids?.length || 0}</span>
                </Link>
              ))}
              {setlists.length === 0 && (
                <div className="text-xs px-2 py-1" style={{ color: colors.textMuted }}>Пусто</div>
              )}
            </div>
          )}
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div className="px-3 py-2 space-y-1" style={{ borderBottom: `1px solid ${colors.border}` }}>
            <Link to="/admin/songs/new" onClick={handleNavClick} className="flex items-center gap-2 px-2 py-1 rounded text-sm" style={{ color: colors.chords }}>
              <IconPlus /> Добавить песню
            </Link>
            <Link to="/admin/import" onClick={handleNavClick} className="flex items-center gap-2 px-2 py-1 rounded text-sm" style={{ color: colors.textMuted }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Импорт
            </Link>
            <a href="/api/export" className="flex items-center gap-2 px-2 py-1 rounded text-sm" style={{ color: colors.textMuted }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Экспорт
            </a>
          </div>
        )}

        {/* Settings section */}
        <div className="px-3 py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex items-center justify-between w-full text-sm font-medium"
            style={{ color: colors.text }}
          >
            <span>Настройки</span>
            <IconChevronRight />
          </button>
          {settingsOpen && (
            <div className="mt-2 space-y-3">
              {/* Themes */}
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: colors.textMuted }}>Тема</div>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(THEME_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => applyTheme(key)}
                      className="px-2 py-1.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: THEMES[key].bg,
                        color: THEMES[key].text,
                        border: settings.theme === key ? `2px solid ${THEMES[key].chords}` : `1px solid ${THEMES[key].border}`,
                      }}
                    >
                      <span style={{ color: THEMES[key].chords }}>Am </span>{label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div>
                <button
                  onClick={() => setColorsOpen(!colorsOpen)}
                  className="flex items-center justify-between w-full text-xs font-semibold"
                  style={{ color: colors.textMuted }}
                >
                  <span>Цвета</span>
                  <IconChevronRight />
                </button>
                {colorsOpen && (
                  <div className="mt-1 space-y-1">
                    {COLOR_LABELS.map(({ key, label }) => (
                      <div key={key}>
                        <button
                          onClick={() => setActiveColor(activeColor === key ? null : key)}
                          className="flex items-center gap-2 w-full px-2 py-1 rounded text-xs"
                          style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
                        >
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: colors[key], border: `1px solid ${colors.border}` }} />
                          <span>{label}</span>
                          <span className="ml-auto font-mono" style={{ color: colors.textMuted, fontSize: 10 }}>{colors[key]}</span>
                        </button>
                        {activeColor === key && (
                          <div className="mt-1 flex justify-center" style={{ maxWidth: '100%' }}>
                            <HexColorPicker
                              color={colors[key]?.startsWith('rgba') ? '#888888' : colors[key]}
                              onChange={(c) => updateSettings({ colors: { ...colors, [key]: c }, theme: 'custom' })}
                              style={{ width: '100%', maxWidth: 220 }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Display settings */}
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: colors.textMuted }}>Просмотр</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: colors.textMuted }}>Аккорды</span>
                    <input type="range" min="-3" max="3" value={settings.chordSizeOffset} onChange={e => updateSettings({ chordSizeOffset: +e.target.value })} className="flex-1" />
                    <span className="font-mono text-xs w-5 text-center">{settings.chordSizeOffset > 0 ? '+' : ''}{settings.chordSizeOffset}</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={settings.mono} onChange={e => updateSettings({ mono: e.target.checked })} className="w-3.5 h-3.5" />
                    <span className="text-xs">Моноширинный шрифт</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={settings.useH} onChange={e => updateSettings({ useH: e.target.checked })} className="w-3.5 h-3.5" />
                    <span className="text-xs">Нотация H (Hm вместо Bm)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={settings.showChords} onChange={e => updateSettings({ showChords: e.target.checked })} className="w-3.5 h-3.5" />
                    <span className="text-xs">Показывать аккорды</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Per-song controls */}
        {controls && (
          <div className="px-3 py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
            <button
              onClick={() => setSongControlsOpen(!songControlsOpen)}
              className="flex items-center justify-between w-full text-sm font-medium"
              style={{ color: colors.text }}
            >
              <span>Песня</span>
              <IconChevronRight />
            </button>
            {songControlsOpen && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs w-16" style={{ color: colors.textMuted }}>Тональность</span>
                  <button onClick={() => controls.onTranspose(-1)} className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}>-</button>
                  <span className="w-6 text-center font-mono text-xs">{controls.transpose > 0 ? '+' : ''}{controls.transpose}</span>
                  <button onClick={() => controls.onTranspose(1)} className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}>+</button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs w-16" style={{ color: colors.textMuted }}>Шрифт</span>
                  <input type="range" min="10" max="28" value={controls.fontSize} onChange={e => controls.onFontSize(+e.target.value)} className="flex-1" />
                  <span className="w-5 text-center font-mono text-xs">{controls.fontSize}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs w-16" style={{ color: colors.textMuted }}>Интервал</span>
                  <input type="range" min="1.0" max="2.0" step="0.1" value={controls.lineHeight} onChange={e => controls.onLineHeight(+e.target.value)} className="flex-1" />
                  <span className="w-5 text-center font-mono text-xs">{controls.lineHeight}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs w-16" style={{ color: colors.textMuted }}>В экран</span>
                  <button onClick={controls.onFitDecrease} className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}>-</button>
                  <button
                    onClick={controls.fitScale ? controls.onFitReset : controls.onAutoFit}
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: controls.fitScale ? colors.chords : colors.bg, color: controls.fitScale ? colors.bg : colors.textMuted, border: `1px solid ${controls.fitScale ? colors.chords : colors.border}` }}
                  >{controls.fitScale ? `${Math.round(controls.fitScale * 100)}%` : 'Авто'}</button>
                  <button onClick={controls.onFitIncrease} className="px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}>+</button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={controls.onScrollToggle}
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: controls.scrollOn ? '#4caf50' : colors.bg, color: controls.scrollOn ? '#fff' : colors.textMuted, border: `1px solid ${controls.scrollOn ? '#4caf50' : colors.border}` }}
                  >{controls.scrollOn ? 'Stop' : 'Прокрутка'}</button>
                  {controls.scrollOn && (
                    <input type="range" min="0" max="100" value={controls.scrollSpeed} onChange={e => controls.onScrollSpeed(+e.target.value)} className="flex-1" />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
