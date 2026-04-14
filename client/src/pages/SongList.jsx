import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSongs } from '../context/SongsContext';
import { useSettings } from '../context/SettingsContext';
import { useAdmin } from '../context/AdminContext';
import { chordToH, transposeKey } from '../utils/transpose';

const STATUS_LABELS = { new: 'Новые', learning: 'Учу', known: 'Знаю' };

export default function SongList() {
  const { songs, setlists, loading } = useSongs();
  const { settings, getSongSettings } = useSettings();
  const { colors } = settings;
  const { isAdmin } = useAdmin();
  const [searchParams] = useSearchParams();
  const [sortCol, setSortCol] = useState('title');
  const [sortAsc, setSortAsc] = useState(true);

  // Read filters from URL (set by Sidebar)
  const qFilter = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || '';
  const artistFilter = searchParams.get('artist') || '';

  const filtered = useMemo(() => {
    let list = songs;
    if (qFilter) {
      const q = qFilter.toLowerCase();
      list = list.filter(s =>
        s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      list = list.filter(s => (s.status || 'new') === statusFilter);
    }
    if (artistFilter) {
      list = list.filter(s => (s.artist || 'Без исполнителя') === artistFilter);
    }
    // Sort
    list = [...list].sort((a, b) => {
      let va, vb;
      if (sortCol === 'title') { va = a.title; vb = b.title; }
      else if (sortCol === 'artist') { va = a.artist; vb = b.artist; }
      else if (sortCol === 'key') { va = a.key || ''; vb = b.key || ''; }
      else if (sortCol === 'status') { va = a.status || 'new'; vb = b.status || 'new'; }
      else if (sortCol === 'created_at') { va = a.created_at || ''; vb = b.created_at || ''; }
      else { va = ''; vb = ''; }
      const cmp = typeof va === 'string' ? va.localeCompare(vb) : 0;
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [songs, qFilter, statusFilter, artistFilter, sortCol, sortAsc]);

  const handleSort = (col) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const activeFilters = [
    artistFilter && `${artistFilter}`,
    statusFilter && STATUS_LABELS[statusFilter],
    qFilter && `"${qFilter}"`,
  ].filter(Boolean);

  const sortArrow = (col) => sortCol === col ? (sortAsc ? ' ↑' : ' ↓') : '';

  const thStyle = {
    color: colors.textMuted,
    borderBottom: `2px solid ${colors.border}`,
    backgroundColor: colors.surface,
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: colors.textMuted }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: colors.bg, color: colors.text }}>
      {/* Active filters indicator */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 text-sm flex-shrink-0" style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
          <span style={{ color: colors.textMuted }}>Фильтр:</span>
          {activeFilters.map((f, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: colors.chords, color: colors.bg }}>
              {f}
            </span>
          ))}
          <Link to="/" className="text-xs ml-auto" style={{ color: colors.textMuted }}>Сбросить</Link>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead className="sticky top-0 z-10">
            <tr>
              <th
                className="text-left px-4 py-2 font-semibold cursor-pointer select-none text-xs"
                style={thStyle}
                onClick={() => handleSort('title')}
              >Песня{sortArrow('title')}</th>
              <th
                className="text-left px-4 py-2 font-semibold cursor-pointer select-none text-xs"
                style={thStyle}
                onClick={() => handleSort('artist')}
              >Исполнитель{sortArrow('artist')}</th>
              <th
                className="text-left px-3 py-2 font-semibold cursor-pointer select-none text-xs w-16"
                style={thStyle}
                onClick={() => handleSort('key')}
              >Тон{sortArrow('key')}</th>
              <th
                className="text-left px-3 py-2 font-semibold cursor-pointer select-none text-xs w-20"
                style={thStyle}
                onClick={() => handleSort('status')}
              >Статус{sortArrow('status')}</th>
              <th
                className="text-left px-3 py-2 font-semibold cursor-pointer select-none text-xs w-24"
                style={thStyle}
                onClick={() => handleSort('created_at')}
              >Добавлена{sortArrow('created_at')}</th>
              {isAdmin && <th className="w-10" style={thStyle}></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(song => {
              const t = getSongSettings(song.id).transpose;
              const k = song.key ? (t ? transposeKey(song.key, t) : song.key) : '';
              const displayKey = settings.useH ? chordToH(k) : k;
              const status = song.status || 'new';
              const date = song.created_at ? new Date(song.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';

              return (
                <tr
                  key={song.id}
                  className="hover:opacity-80 transition-colors cursor-pointer"
                  style={{ borderBottom: `1px solid ${colors.border}` }}
                >
                  <td className="px-4 py-2.5">
                    <Link to={`/song/${song.id}`} className="font-medium hover:underline" style={{ color: colors.text }}>
                      {song.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5" style={{ color: colors.textMuted }}>{song.artist}</td>
                  <td className="px-3 py-2.5 font-mono text-xs" style={{ color: colors.chords }}>{displayKey}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs" style={{ color: colors.textMuted }}>
                      {STATUS_LABELS[status] || status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: colors.textMuted }}>{date}</td>
                  {isAdmin && (
                    <td className="px-2 py-2.5">
                      <Link to={`/admin/songs/${song.id}`} style={{ color: colors.textMuted }} title="Редактировать">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </Link>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center" style={{ color: colors.textMuted }}>
            {songs.length === 0 ? 'Пока нет песен' : 'Ничего не найдено'}
          </div>
        )}
      </div>
    </div>
  );
}
