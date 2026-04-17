import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchSongs, fetchSetlist, createSetlist, updateSetlist, deleteSetlist } from '../api/songs';
import { useSettings } from '../context/SettingsContext';
import { useSongs } from '../context/SongsContext';
import SongMenu from '../components/SongMenu';

export default function SetlistEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const { settings } = useSettings();
  const { colors } = settings;
  const { reload } = useSongs();

  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [allSongs, setAllSongs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(true); // true = all songs, false = only in setlist

  useEffect(() => {
    const load = async () => {
      const songs = await fetchSongs();
      setAllSongs(songs);
      if (!isNew) {
        const sl = await fetchSetlist(id);
        setName(sl.name);
        setSelectedIds(sl.song_ids || []);
      }
      setLoading(false);
    };
    load();
  }, [id, isNew]);

  const toggleSong = (songId) => {
    setSelectedIds(prev =>
      prev.includes(songId) ? prev.filter(i => i !== songId) : [...prev, songId]
    );
  };

  const moveSong = (songId, direction) => {
    setSelectedIds(prev => {
      const idx = prev.indexOf(songId);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  // Songs to display: either all or only selected, preserving selectedIds order
  const displaySongs = useMemo(() => {
    if (showAll) {
      // Selected first (in order), then unselected
      const selected = selectedIds.map(sid => allSongs.find(s => s.id === sid)).filter(Boolean);
      const unselected = allSongs.filter(s => !selectedIds.includes(s.id));
      return [...selected, ...unselected];
    } else {
      return selectedIds.map(sid => allSongs.find(s => s.id === sid)).filter(Boolean);
    }
  }, [showAll, selectedIds, allSongs]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const data = { name: name.trim(), song_ids: selectedIds };
      if (isNew) {
        const sl = await createSetlist(data);
        reload();
        navigate(`/setlist/${sl.id}`);
      } else {
        await updateSetlist(id, data);
        reload();
        navigate(`/setlist/${id}`);
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить сет-лист?')) return;
    try {
      await deleteSetlist(id);
      reload();
      navigate('/');
    } catch (e) {
      alert(e.message);
    }
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
      <header
        className="flex-shrink-0 px-4 py-2 flex items-center"
        style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}
      >
        <h1 className="text-base font-semibold">{isNew ? 'Новый сет-лист' : 'Редактирование сет-листа'}</h1>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-3 max-w-2xl">
          {/* Name + Save */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Название сет-листа *"
              value={name}
              onChange={e => setName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg outline-none text-sm"
              style={{ backgroundColor: colors.surface, color: colors.text, border: `1px solid ${colors.border}` }}
            />
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: colors.accent, color: colors.bg }}
            >
              {saving ? '...' : 'Сохранить'}
            </button>
          </div>

          {/* Filter toggle + count */}
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
              <button
                onClick={() => setShowAll(true)}
                className="px-3 py-1 text-xs font-medium cursor-pointer"
                style={{
                  backgroundColor: showAll ? colors.accent : 'transparent',
                  color: showAll ? colors.bg : colors.textMuted,
                }}
              >
                Все песни
              </button>
              <button
                onClick={() => setShowAll(false)}
                className="px-3 py-1 text-xs font-medium cursor-pointer"
                style={{
                  backgroundColor: !showAll ? colors.accent : 'transparent',
                  color: !showAll ? colors.bg : colors.textMuted,
                }}
              >
                В сет-листе ({selectedIds.length})
              </button>
            </div>
            {!isNew && (
              <button
                onClick={handleDelete}
                className="text-xs px-2 py-1 rounded cursor-pointer ml-auto"
                style={{ color: '#e05555', border: `1px solid ${colors.border}` }}
              >
                Удалить сет-лист
              </button>
            )}
          </div>

          {/* Song list — compact rows: checkbox | title+artist | order arrows | menu */}
          <div className="rounded overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
            {displaySongs.map((song) => {
              const selected = selectedIds.includes(song.id);
              const orderIdx = selectedIds.indexOf(song.id);
              return (
                <div
                  key={song.id}
                  className="flex items-center gap-2 px-2 py-2"
                  style={{
                    borderBottom: `1px solid ${colors.border}`,
                    backgroundColor: selected ? colors.surface : 'transparent',
                  }}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSong(song.id)}
                    className="w-4 h-4 cursor-pointer flex-shrink-0"
                  />

                  {/* Title + Artist */}
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium" style={{ color: colors.text }}>{song.title}</div>
                    {song.artist && (
                      <div className="truncate text-xs" style={{ color: colors.textMuted }}>{song.artist}</div>
                    )}
                  </div>

                  {/* Order arrows (only for selected) */}
                  {selected && (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => moveSong(song.id, -1)}
                        disabled={orderIdx === 0}
                        className="p-1 rounded cursor-pointer disabled:opacity-20"
                        style={{ color: colors.textMuted }}
                        title="Вверх"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 15l-6-6-6 6" />
                        </svg>
                      </button>
                      <span className="text-xs w-4 text-center font-mono" style={{ color: colors.textMuted }}>{orderIdx + 1}</span>
                      <button
                        onClick={() => moveSong(song.id, 1)}
                        disabled={orderIdx === selectedIds.length - 1}
                        className="p-1 rounded cursor-pointer disabled:opacity-20"
                        style={{ color: colors.textMuted }}
                        title="Вниз"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Three-dot menu */}
                  <div className="flex-shrink-0">
                    <SongMenu songId={song.id} songStatus={song.status} onStatusChange={() => {}} />
                  </div>
                </div>
              );
            })}
            {displaySongs.length === 0 && (
              <div className="px-3 py-4 text-center text-xs" style={{ color: colors.textMuted }}>
                {showAll ? 'Пока нет песен' : 'В сет-листе нет песен'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
