import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchSongs, fetchSetlist, createSetlist, updateSetlist, deleteSetlist } from '../api/songs';
import { useSettings } from '../context/SettingsContext';
import { useSongs } from '../context/SongsContext';

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

  const thStyle = {
    color: colors.textMuted,
    borderBottom: `2px solid ${colors.border}`,
    backgroundColor: colors.surface,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: colors.bg, color: colors.text }}>
      {/* Header — just title */}
      <header
        className="flex-shrink-0 px-4 py-2 flex items-center"
        style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}
      >
        <h1 className="text-base font-semibold">{isNew ? 'Новый сет-лист' : 'Редактирование сет-листа'}</h1>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-4 max-w-2xl">
          {/* Name + Save button on same row */}
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
              className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: colors.chords, color: colors.bg }}
            >
              {saving ? '...' : 'Сохранить'}
            </button>
          </div>

          <div className="text-sm" style={{ color: colors.textMuted }}>
            Выбрано: {selectedIds.length} песен
          </div>

          {/* Song selection table */}
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '40px' }} />
              <col style={{ width: '45%' }} />
              <col style={{ width: '35%' }} />
              <col />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr>
                <th style={thStyle}></th>
                <th className="text-left px-3 py-2 font-semibold text-xs" style={thStyle}>Песня</th>
                <th className="text-left px-3 py-2 font-semibold text-xs" style={thStyle}>Исполнитель</th>
                <th className="text-left px-3 py-2 font-semibold text-xs" style={thStyle}>Тон</th>
              </tr>
            </thead>
            <tbody>
              {allSongs.map(song => {
                const selected = selectedIds.includes(song.id);
                return (
                  <tr
                    key={song.id}
                    className="cursor-pointer"
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      backgroundColor: selected ? colors.surface : 'transparent',
                    }}
                    onClick={() => toggleSong(song.id)}
                  >
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSong(song.id)}
                        className="w-4 h-4 cursor-pointer"
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-3 py-2 truncate">{song.title}</td>
                    <td className="px-3 py-2 truncate" style={{ color: colors.textMuted }}>{song.artist}</td>
                    <td className="px-3 py-2 font-mono text-xs" style={{ color: colors.chords }}>{song.key || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!isNew && (
            <button
              onClick={handleDelete}
              className="text-sm px-3 py-1 rounded"
              style={{ color: '#e05555' }}
            >
              Удалить сет-лист
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
