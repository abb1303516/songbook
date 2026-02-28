import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSetlist } from '../api/songs';
import { useSettings } from '../context/SettingsContext';
import { useAdmin } from '../context/AdminContext';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { transposeKey } from '../utils/transpose';
import SongContent from '../components/SongContent';

const FIT_STEP = 0.05;

export default function SetlistView() {
  const { id } = useParams();
  const [setlist, setSetlist] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const { settings, getSongSettings, updateSongSettings, updateSettings } = useSettings();
  const { isAdmin } = useAdmin();
  const { colors } = settings;
  const autoScroll = useAutoScroll(containerRef);

  useEffect(() => {
    fetchSetlist(id).then(setSetlist).finally(() => setLoading(false));
  }, [id]);

  const song = setlist?.songs?.[currentIdx];
  const songSettings = getSongSettings(song?.id || '');
  const { transpose, fontSize, lineHeight, fitScale } = songSettings;

  // Effective values with fitScale applied
  const effectiveFontSize = fitScale
    ? Math.max(Math.round(fontSize * fitScale), 8)
    : fontSize;
  const effectiveLineHeight = fitScale
    ? Math.max(+(lineHeight * fitScale).toFixed(2), 1.0)
    : lineHeight;

  const goTo = (idx) => {
    setCurrentIdx(idx);
    autoScroll.setOn(false);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  };

  // Auto-calculate optimal fitScale
  const autoFit = useCallback(() => {
    if (!song) return;
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const prevFS = content.style.fontSize;
    const prevLH = content.style.lineHeight;
    content.style.fontSize = `${fontSize}px`;
    content.style.lineHeight = `${lineHeight}`;

    const naturalH = content.scrollHeight;
    const naturalW = content.scrollWidth;

    content.style.fontSize = prevFS;
    content.style.lineHeight = prevLH;

    const availH = container.clientHeight;
    const availW = container.clientWidth;

    const scale = Math.min(availH / naturalH, availW / naturalW);
    const clamped = Math.max(Math.min(scale, 2.0), 0.3);

    updateSongSettings(song.id, { fitScale: +clamped.toFixed(3) });
  }, [song, fontSize, lineHeight, updateSongSettings]);

  const adjustFit = useCallback((delta) => {
    if (!song) return;
    const current = fitScale || 1.0;
    const next = Math.max(Math.min(current + delta, 2.0), 0.3);
    updateSongSettings(song.id, { fitScale: +next.toFixed(3) });
  }, [song, fitScale, updateSongSettings]);

  const resetFit = useCallback(() => {
    if (!song) return;
    updateSongSettings(song.id, { fitScale: null });
  }, [song, updateSongSettings]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
        Загрузка...
      </div>
    );
  }

  if (!setlist) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
        Сет-лист не найден
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: colors.bg, color: colors.text }}>
        <header className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
          <Link to="/" className="p-1" style={{ color: colors.textMuted }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Link>
          <div className="font-semibold">{setlist.name}</div>
        </header>
        <div className="flex-1 flex items-center justify-center" style={{ color: colors.textMuted }}>
          В этом сет-листе нет песен
        </div>
      </div>
    );
  }

  const currentKey = song.key ? transposeKey(song.key, transpose) : '';
  const total = setlist.songs.length;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: colors.bg, color: colors.text }}>
      {/* Header */}
      <header
        className="flex-shrink-0 px-3 py-2 flex items-center gap-1.5"
        style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}
      >
        <Link to="/" className="p-1" style={{ color: colors.textMuted }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </Link>

        {/* Prev */}
        <button
          onClick={() => goTo(currentIdx - 1)}
          disabled={currentIdx === 0}
          className="p-1 disabled:opacity-30"
          style={{ color: colors.textMuted }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        <div className="flex-1 min-w-0 text-center">
          <div className="font-semibold truncate text-sm">{song.title}</div>
          <div className="text-xs" style={{ color: colors.textMuted }}>
            {setlist.name} — {currentIdx + 1}/{total}
            {currentKey && <span className="ml-2" style={{ color: colors.chords }}>{currentKey}</span>}
          </div>
        </div>

        {/* Next */}
        <button
          onClick={() => goTo(currentIdx + 1)}
          disabled={currentIdx === total - 1}
          className="p-1 disabled:opacity-30"
          style={{ color: colors.textMuted }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>

        {/* Fit-to-screen 3-part control */}
        <div className="flex items-center rounded overflow-hidden" style={{ border: `1px solid ${fitScale ? colors.chords : colors.border}` }}>
          <button
            onClick={() => adjustFit(-FIT_STEP)}
            className="px-1.5 py-1 text-xs font-mono"
            style={{
              backgroundColor: fitScale ? colors.chords : colors.bg,
              color: fitScale ? colors.bg : colors.textMuted,
              borderRight: `1px solid ${fitScale ? 'rgba(255,255,255,0.2)' : colors.border}`,
            }}
            title="Уменьшить"
          >−</button>
          <button
            onClick={fitScale ? resetFit : autoFit}
            className="px-2 py-1 text-xs font-medium"
            style={{
              backgroundColor: fitScale ? colors.chords : colors.bg,
              color: fitScale ? colors.bg : colors.textMuted,
            }}
            title={fitScale ? 'Сбросить' : 'Вписать в экран'}
          >
            {fitScale ? `${Math.round(fitScale * 100)}%` : 'В экран'}
          </button>
          <button
            onClick={() => adjustFit(FIT_STEP)}
            className="px-1.5 py-1 text-xs font-mono"
            style={{
              backgroundColor: fitScale ? colors.chords : colors.bg,
              color: fitScale ? colors.bg : colors.textMuted,
              borderLeft: `1px solid ${fitScale ? 'rgba(255,255,255,0.2)' : colors.border}`,
            }}
            title="Увеличить"
          >+</button>
        </div>

        {/* Controls toggle */}
        <button
          onClick={() => setShowControls(!showControls)}
          className="p-1.5 rounded"
          style={{ color: showControls ? colors.chords : colors.textMuted }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
          </svg>
        </button>

        {/* Edit button (admin only) */}
        {isAdmin && (
          <Link to={`/admin/setlists/${id}`} className="p-1.5 rounded" style={{ color: colors.textMuted }} title="Редактировать сет-лист">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </Link>
        )}

        <Link to="/settings" className="p-1.5 rounded" style={{ color: colors.textMuted }} title="Настройки">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        </Link>
      </header>

      {/* Controls */}
      {showControls && (
        <div
          className="flex-shrink-0 px-4 py-3 space-y-3 text-sm"
          style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}
        >
          {/* Font size */}
          <div className="flex items-center gap-2">
            <span className="w-24" style={{ color: colors.textMuted }}>Шрифт</span>
            <input type="range" min="10" max="28" value={fontSize} onChange={e => updateSongSettings(song.id, { fontSize: +e.target.value })} className="flex-1" />
            <span className="w-8 text-center font-mono text-xs">{fontSize}</span>
          </div>

          {/* Line height */}
          <div className="flex items-center gap-2">
            <span className="w-24" style={{ color: colors.textMuted }}>Интервал</span>
            <input type="range" min="1.0" max="2.0" step="0.1" value={lineHeight} onChange={e => updateSongSettings(song.id, { lineHeight: +e.target.value })} className="flex-1" />
            <span className="w-8 text-center font-mono text-xs">{lineHeight}</span>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => updateSettings({ showChords: !settings.showChords })}
              className="px-2.5 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: settings.showChords ? colors.chords : colors.bg,
                color: settings.showChords ? colors.bg : colors.textMuted,
                border: `1px solid ${settings.showChords ? colors.chords : colors.border}`,
              }}
            >Аккорды</button>

            {/* Auto-scroll */}
            <button
              onClick={() => autoScroll.setOn(!autoScroll.on)}
              className="px-2.5 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: autoScroll.on ? '#4caf50' : colors.bg,
                color: autoScroll.on ? '#fff' : colors.textMuted,
                border: `1px solid ${autoScroll.on ? '#4caf50' : colors.border}`,
              }}
            >{autoScroll.on ? '⏸' : '▶'} Прокрутка</button>
          </div>
        </div>
      )}

      {/* Song content */}
      <div ref={containerRef} className="flex-1 overflow-auto px-4 py-4">
        <div ref={contentRef}>
          <SongContent
            chordpro={song.chordpro}
            transpose={transpose}
            showChords={settings.showChords}
            fontSize={effectiveFontSize}
            lineHeight={effectiveLineHeight}
            chordColor={colors.chords}
            chordSizeOffset={settings.chordSizeOffset}
            mono={settings.mono}
            colors={colors}
          />
        </div>
      </div>
    </div>
  );
}
