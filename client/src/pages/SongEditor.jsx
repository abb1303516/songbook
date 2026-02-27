import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchSong, fetchSongs, createSong, updateSong, deleteSong } from '../api/songs';
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
  const [tags, setTags] = useState('');
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
        setTags(song.tags?.join(', ') || '');
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
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
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
        <Link to="/admin" className="p-1" style={{ color: colors.textMuted }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>
        <h1 className="text-lg font-semibold flex-1">{isNew ? 'Новая песня' : 'Редактирование'}</h1>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="px-2.5 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: showPreview ? colors.chords : colors.bg,
            color: showPreview ? colors.bg : colors.textMuted,
            border: `1px solid ${showPreview ? colors.chords : colors.border}`,
          }}
        >
          Превью
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: colors.chords, color: colors.bg }}
        >
          {saving ? '...' : 'Сохранить'}
        </button>
      </header>

      <div className="p-4 space-y-3 max-w-2xl mx-auto">
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
        </div>
        <input
          type="text"
          placeholder="Теги (через запятую)"
          value={tags}
          onChange={e => setTags(e.target.value)}
          className="w-full px-3 py-2 rounded-lg outline-none text-sm"
          style={{ backgroundColor: colors.surface, color: colors.text, border: `1px solid ${colors.border}` }}
        />

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
              chordSizeOffset={settings.chordSizeOffset}
              mono={settings.mono}
              colors={colors}
            />
          </div>
        ) : (
          <textarea
            placeholder="Текст в формате ChordPro&#10;&#10;{sov}&#10;[Am]Текст песни [C]с аккордами&#10;{eov}&#10;&#10;{soc: Припев}&#10;[Dm]Припев [G]здесь&#10;{eoc}"
            value={chordpro}
            onChange={e => setChordpro(e.target.value)}
            className="w-full px-3 py-2 rounded-lg outline-none text-sm font-mono min-h-[400px] resize-y"
            style={{ backgroundColor: colors.surface, color: colors.text, border: `1px solid ${colors.border}` }}
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
