import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchSongs, fetchSetlists } from '../api/songs';
import { useSettings } from '../context/SettingsContext';
import { useAdmin } from '../context/AdminContext';

export default function SongList() {
  const [songs, setSongs] = useState([]);
  const [setlists, setSetlists] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState([]);
  const [tab, setTab] = useState('songs'); // songs | setlists
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();
  const { colors } = settings;
  const { isAdmin, logout } = useAdmin();

  useEffect(() => {
    Promise.all([fetchSongs(), fetchSetlists()])
      .then(([s, sl]) => { setSongs(s); setSetlists(sl); })
      .finally(() => setLoading(false));
  }, []);

  const allTags = useMemo(() => {
    const tags = new Set();
    songs.forEach(s => s.tags?.forEach(t => tags.add(t)));
    return [...tags].sort();
  }, [songs]);

  const filtered = useMemo(() => {
    let list = songs;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
      );
    }
    if (activeTags.length > 0) {
      list = list.filter(s => activeTags.some(t => s.tags?.includes(t)));
    }
    return list;
  }, [songs, search, activeTags]);

  const toggleTag = (tag) => {
    setActiveTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg, color: colors.text }}>
        <p style={{ color: colors.textMuted }}>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg, color: colors.text }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-2"
        style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}
      >
        <h1 className="text-xl font-bold flex-shrink-0">Песенник</h1>
        <input
          type="text"
          placeholder="Поиск..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-1.5 rounded-lg outline-none text-sm min-w-0"
          style={{
            backgroundColor: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
          }}
        />

        {/* Admin controls */}
        {isAdmin && (
          <>
            <Link
              to="/admin/songs/new"
              className="p-1.5 rounded-lg"
              style={{ color: colors.chords }}
              title="Добавить песню"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </Link>
            <Link
              to="/admin/import"
              className="p-1.5 rounded-lg"
              style={{ color: colors.textMuted }}
              title="Импорт"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </Link>
            <a
              href="/api/export"
              className="p-1.5 rounded-lg"
              style={{ color: colors.textMuted }}
              title="Экспорт"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </a>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg"
              style={{ color: colors.textMuted }}
              title="Выйти из админки"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </>
        )}

        <Link
          to="/settings"
          className="p-1.5 rounded-lg"
          style={{ color: colors.textMuted }}
          title="Настройки"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        </Link>
      </header>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: colors.border }}>
        <button
          onClick={() => setTab('songs')}
          className="flex-1 py-2 text-sm font-medium text-center"
          style={{
            color: tab === 'songs' ? colors.chords : colors.textMuted,
            borderBottom: tab === 'songs' ? `2px solid ${colors.chords}` : '2px solid transparent',
          }}
        >
          Песни ({songs.length})
        </button>
        <button
          onClick={() => setTab('setlists')}
          className="flex-1 py-2 text-sm font-medium text-center"
          style={{
            color: tab === 'setlists' ? colors.chords : colors.textMuted,
            borderBottom: tab === 'setlists' ? `2px solid ${colors.chords}` : '2px solid transparent',
          }}
        >
          Сет-листы ({setlists.length})
        </button>
      </div>

      {tab === 'songs' && (
        <>
          {/* Tags */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: activeTags.includes(tag) ? colors.chords : colors.surface,
                    color: activeTags.includes(tag) ? colors.bg : colors.textMuted,
                    border: `1px solid ${activeTags.includes(tag) ? colors.chords : colors.border}`,
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Song list */}
          <div className="divide-y" style={{ borderColor: colors.border }}>
            {filtered.map(song => (
              <div
                key={song.id}
                className="flex items-center hover:opacity-90 transition-colors"
                style={{ borderColor: colors.border }}
              >
                <Link
                  to={`/song/${song.id}`}
                  className="flex-1 px-4 py-3 min-w-0"
                >
                  <div className="font-medium truncate">{song.title}</div>
                  {song.artist && (
                    <div className="text-sm truncate" style={{ color: colors.textMuted }}>
                      {song.artist}
                      {song.key && <span className="ml-2" style={{ color: colors.chords }}>{song.key}</span>}
                    </div>
                  )}
                </Link>
                {isAdmin && (
                  <Link
                    to={`/admin/songs/${song.id}`}
                    className="px-3 py-3 flex-shrink-0"
                    style={{ color: colors.textMuted }}
                    title="Редактировать"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </Link>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center" style={{ color: colors.textMuted }}>
                {songs.length === 0 ? 'Пока нет песен' : 'Ничего не найдено'}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'setlists' && (
        <>
          {/* New setlist button for admin */}
          {isAdmin && (
            <div className="px-4 py-2 flex justify-end" style={{ borderBottom: `1px solid ${colors.border}` }}>
              <Link
                to="/admin/setlists/new"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{ backgroundColor: colors.chords, color: colors.bg }}
              >
                + Новый сет-лист
              </Link>
            </div>
          )}

          <div className="divide-y" style={{ borderColor: colors.border }}>
            {setlists.map(sl => (
              <div
                key={sl.id}
                className="flex items-center hover:opacity-90"
                style={{ borderColor: colors.border }}
              >
                <Link
                  to={`/setlist/${sl.id}`}
                  className="flex-1 px-4 py-3 min-w-0"
                >
                  <div className="font-medium truncate">{sl.name}</div>
                  <div className="text-sm" style={{ color: colors.textMuted }}>
                    {sl.song_ids?.length || 0} песен
                  </div>
                </Link>
                {isAdmin && (
                  <Link
                    to={`/admin/setlists/${sl.id}`}
                    className="px-3 py-3 flex-shrink-0"
                    style={{ color: colors.textMuted }}
                    title="Редактировать"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </Link>
                )}
              </div>
            ))}
            {setlists.length === 0 && (
              <div className="px-4 py-8 text-center" style={{ color: colors.textMuted }}>
                Пока нет сет-листов
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
