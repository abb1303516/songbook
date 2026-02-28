import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchSongs, fetchSetlist, createSetlist, updateSetlist, deleteSetlist } from '../api/songs';
import { useSettings } from '../context/SettingsContext';

export default function SetlistEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const { settings } = useSettings();
  const { colors } = settings;

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
      prev.includes(songId) ? prev.filter(id => id !== songId) : [...prev, songId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const data = { name: name.trim(), song_ids: selectedIds };
      if (isNew) {
        const sl = await createSetlist(data);
        navigate(`/setlist/${sl.id}`);
      } else {
        await updateSetlist(id, data);
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
      navigate('/');
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg, color: colors.text }}>
      <header
        className="sticky top-0 z-10 px-4 py-2 flex items-center gap-2"
        style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}
      >
        <button onClick={() => navigate(-1)} className="p-1" style={{ color: colors.textMuted }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-lg font-semibold flex-1">{isNew ? 'Новый сет-лист' : 'Редактирование'}</h1>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: colors.chords, color: colors.bg }}
        >
          {saving ? '...' : 'Сохранить'}
        </button>
      </header>

      <div className="p-4 space-y-3 max-w-lg mx-auto">
        <input
          type="text"
          placeholder="Название сет-листа *"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg outline-none text-sm"
          style={{ backgroundColor: colors.surface, color: colors.text, border: `1px solid ${colors.border}` }}
        />

        <div className="text-sm" style={{ color: colors.textMuted }}>
          Выбрано: {selectedIds.length} песен
        </div>

        <div className="space-y-1">
          {allSongs.map(song => (
            <label
              key={song.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
              style={{ backgroundColor: selectedIds.includes(song.id) ? colors.surface : 'transparent' }}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(song.id)}
                onChange={() => toggleSong(song.id)}
                className="w-4 h-4"
              />
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm">{song.title}</div>
                {song.artist && <div className="text-xs" style={{ color: colors.textMuted }}>{song.artist}</div>}
              </div>
            </label>
          ))}
        </div>

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
  );
}
