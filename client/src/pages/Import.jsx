import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { importChordPro } from '../api/songs';
import { useSettings } from '../context/SettingsContext';

export default function Import() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { colors } = settings;
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const content = await file.text();
    setText(content);
  };

  const handleImport = async () => {
    if (!text.trim()) return;
    setImporting(true);
    try {
      const res = await importChordPro(
        text,
        tags.split(',').map(t => t.trim()).filter(Boolean)
      );
      setResult(res);
    } catch (e) {
      alert(e.message);
    } finally {
      setImporting(false);
    }
  };

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
        <h1 className="text-lg font-semibold">Импорт ChordPro</h1>
      </header>

      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        {result ? (
          <div className="space-y-3">
            <p>Импортировано песен: <strong>{result.count}</strong></p>
            <ul className="space-y-1">
              {result.imported.map(s => (
                <li key={s.id}>
                  <Link to={`/song/${s.id}`} style={{ color: colors.chords }}>{s.title}</Link>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                onClick={() => { setText(''); setResult(null); }}
                className="px-3 py-1.5 rounded text-sm"
                style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}` }}
              >
                Импортировать ещё
              </button>
              <Link
                to="/"
                className="px-3 py-1.5 rounded text-sm"
                style={{ backgroundColor: colors.chords, color: colors.bg }}
              >
                К списку песен
              </Link>
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-lg text-sm border-2 border-dashed"
              style={{ borderColor: colors.border, color: colors.textMuted }}
            >
              Выбрать файл (.chordpro, .cho, .txt)
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".chordpro,.cho,.txt"
              onChange={handleFile}
              className="hidden"
            />

            <div className="text-center text-xs" style={{ color: colors.textMuted }}>или вставьте текст</div>

            <textarea
              placeholder="Вставьте текст в формате ChordPro..."
              value={text}
              onChange={e => setText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg outline-none text-sm font-mono min-h-[300px] resize-y"
              style={{ backgroundColor: colors.surface, color: colors.text, border: `1px solid ${colors.border}` }}
            />

            <input
              type="text"
              placeholder="Теги для импортированных песен (через запятую)"
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="w-full px-3 py-2 rounded-lg outline-none text-sm"
              style={{ backgroundColor: colors.surface, color: colors.text, border: `1px solid ${colors.border}` }}
            />

            <button
              onClick={handleImport}
              disabled={importing || !text.trim()}
              className="w-full py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: colors.chords, color: colors.bg }}
            >
              {importing ? 'Импорт...' : 'Импортировать'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
