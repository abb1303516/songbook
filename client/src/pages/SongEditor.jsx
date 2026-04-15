import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchSong, createSong, updateSong, deleteSong } from '../api/songs';
import { useSettings } from '../context/SettingsContext';
import SongContent from '../components/SongContent';

export default function SongEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const { settings } = useSettings();
  const { colors } = settings;

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [key, setKey] = useState('');
  const [chordpro, setChordpro] = useState('');
  const [status, setStatus] = useState('new');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (!isNew) {
      fetchSong(id).then(song => {
        setTitle(song.title);
        setArtist(song.artist || '');
        setKey(song.key || '');
        setChordpro(song.chordpro || '');
        setStatus(song.status || 'new');
      }).finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        artist: artist.trim(),
        key: key.trim(),
        chordpro: chordpro,
        status,
      };
      if (isNew) {
        const song = await createSong(data);
        navigate(`/song/${song.id}`);
      } else {
        await updateSong(id, data);
        navigate(`/song/${id}`);
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить песню?')) return;
    try {
      await deleteSong(id);
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
      {/* Header — just title */}
      <header
        className="flex-shrink-0 px-4 py-2 flex items-center"
        style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}
      >
        <h1 className="text-base font-semibold">{isNew ? 'Новая песня' : 'Редактирование песни'}</h1>
      </header>

      <div className="flex-1 overflow-auto p-4 space-y-3 max-w-2xl w-full">
        <input
          type="text"
          placeholder="Название *"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-lg outline-none text-sm"
          style={{ backgroundColor: colors.surface, color: colors.text, border: `1px solid ${colors.border}` }}
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Исполнитель"
            value={artist}
            onChange={e => setArtist(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg outline-none text-sm"
            style={{ backgroundColor: colors.surface, color: colors.text, border: `1px solid ${colors.border}` }}
          />
          <input
            type="text"
            placeholder="Тональность"
            value={key}
            onChange={e => setKey(e.target.value)}
            className="w-24 px-3 py-2 rounded-lg outline-none text-sm"
            style={{ backgroundColor: colors.surface, color: colors.text, border: `1px solid ${colors.border}` }}
          />
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 rounded-lg outline-none text-sm"
            style={{ backgroundColor: colors.surface, color: colors.text, border: `1px solid ${colors.border}` }}
          >
            <option value="new">Новая</option>
            <option value="learning">Учу</option>
            <option value="known">Знаю</option>
          </select>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: colors.accent, color: colors.bg }}
          >
            {saving ? '...' : 'Сохранить'}
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-3 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: showPreview ? colors.accent : colors.bg,
              color: showPreview ? colors.bg : colors.textMuted,
              border: `1px solid ${showPreview ? colors.accent : colors.border}`,
            }}
          >
            {showPreview ? 'Редактор' : 'Превью'}
          </button>
        </div>

        {showPreview ? (
          <div
            className="p-4 rounded-lg min-h-[300px]"
            style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
          >
            <SongContent
              chordpro={chordpro}
              showChords={true}
              fontSize={15}
              lineHeight={1.4}
              chordColor={colors.chords}
              colors={colors}
            />
          </div>
        ) : (
          <textarea
            placeholder="Текст в формате ChordPro&#10;&#10;{sov}&#10;[Am]Текст песни [C]с аккордами&#10;{eov}&#10;&#10;{soc: Припев}&#10;[Dm]Припев [G]здесь&#10;{eoc}"
            value={chordpro}
            onChange={e => setChordpro(e.target.value)}
            className="w-full px-3 py-2 rounded-lg outline-none text-sm font-mono resize-none"
            style={{ backgroundColor: colors.surface, color: colors.text, border: `1px solid ${colors.border}`, minHeight: 'calc(100vh - 280px)' }}
          />
        )}

        {!isNew && (
          <button
            onClick={handleDelete}
            className="text-sm px-3 py-1 rounded"
            style={{ color: '#e05555' }}
          >
            Удалить песню
          </button>
        )}
      </div>
    </div>
  );
}
