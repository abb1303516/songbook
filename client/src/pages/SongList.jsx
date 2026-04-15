import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useSongs } from '../context/SongsContext';
import { useSettings } from '../context/SettingsContext';
import { useAdmin } from '../context/AdminContext';
import { updateSongStatus } from '../api/songs';
import { chordToH, transposeKey } from '../utils/transpose';
import SongMenu from '../components/SongMenu';

const STATUS_LABELS = { new: 'Новые', learning: 'Учу', known: 'Знаю' };

export default function SongList() {
  const { songs, setlists, loading, reload, setNavList } = useSongs();
  const { settings } = useSettings();
  const { colors } = settings;
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
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

  // Keep nav list in sync with current filtered view
  useEffect(() => {
    setNavList(filtered.map(s => s.id));
  }, [filtered, setNavList]);

  const handleSort = (col) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const activeFilters = [
    artistFilter && { label: artistFilter, param: 'artist' },
    statusFilter && { label: STATUS_LABELS[statusFilter], param: 'status' },
    qFilter && { label: `"${qFilter}"`, param: 'q' },
  ].filter(Boolean);

  const removeFilter = (param) => {
    const params = new URLSearchParams(searchParams);
    params.delete(param);
    const qs = params.toString();
    navigate(`/${qs ? '?' + qs : ''}`, { replace: true });
  };

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
        <div className="flex items-center gap-2 px-4 py-1.5 text-sm flex-shrink-0" style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
          {activeFilters.map((f) => (
            <button
              key={f.param}
              onClick={() => removeFilter(f.param)}
              className="group flex items-center gap-1 px-2 py-0.5 rounded-full text-xs cursor-pointer"
              style={{ backgroundColor: colors.accent, color: colors.bg }}
              title="Убрать фильтр"
            >
              {f.label}
              <svg className="opacity-50 group-hover:opacity-100" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '35%' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '36px' }} />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="text-left px-4 py-2 font-semibold cursor-pointer select-none text-xs" style={thStyle} onClick={() => handleSort('title')}>
                Песня{sortArrow('title')}
              </th>
              <th className="text-left px-4 py-2 font-semibold cursor-pointer select-none text-xs" style={thStyle} onClick={() => handleSort('artist')}>
                Исполнитель{sortArrow('artist')}
              </th>
              <th className="text-left px-3 py-2 font-semibold cursor-pointer select-none text-xs" style={thStyle} onClick={() => handleSort('key')}>
                Тон{sortArrow('key')}
              </th>
              <th className="text-left px-3 py-2 font-semibold cursor-pointer select-none text-xs" style={thStyle} onClick={() => handleSort('status')}>
                Статус{sortArrow('status')}
              </th>
              <th className="text-left px-3 py-2 font-semibold cursor-pointer select-none text-xs" style={thStyle} onClick={() => handleSort('created_at')}>
                Добавлена{sortArrow('created_at')}
              </th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(song => {
              const t = song.transpose || 0;
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
                  <td className="px-4 py-2.5 truncate">
                    <Link to={`/song/${song.id}`} className="font-medium hover:underline" style={{ color: colors.text }}>
                      {song.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 truncate" style={{ color: colors.textMuted }}>{song.artist}</td>
                  <td className="px-3 py-2.5 font-mono text-xs" style={{ color: colors.chords }}>{displayKey}</td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const cycle = ['new', 'learning', 'known'];
                        const next = cycle[(cycle.indexOf(status) + 1) % cycle.length];
                        try {
                          await updateSongStatus(song.id, next);
                          reload();
                        } catch (err) { /* ignore */ }
                      }}
                      className="text-xs cursor-pointer px-1.5 py-0.5 rounded"
                      style={{ color: colors.textMuted, border: `1px solid ${colors.border}` }}
                      title="Нажмите для смены статуса"
                    >
                      {STATUS_LABELS[status] || status}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-xs" style={{ color: colors.textMuted }}>{date}</td>
                  <td className="px-1 py-2.5">
                    <SongMenu songId={song.id} songStatus={status} onStatusChange={() => reload()} />
                  </td>
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
