import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSong } from '../api/songs';
import { useSettings } from '../context/SettingsContext';
import { useAdmin } from '../context/AdminContext';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { transposeKey } from '../utils/transpose';
import SongContent from '../components/SongContent';

const FIT_STEP = 0.05; // 5% per click

export default function SongView() {
  const { id } = useParams();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const { settings, getSongSettings, updateSongSettings, updateSettings } = useSettings();
  const { isAdmin } = useAdmin();
  const { colors } = settings;
  const autoScroll = useAutoScroll(containerRef);

  const songSettings = getSongSettings(id);
  const { transpose, fontSize, lineHeight, fitScale } = songSettings;

  // Effective values with fitScale applied
  const effectiveFontSize = fitScale
    ? Math.max(Math.round(fontSize * fitScale), 8)
    : fontSize;
  const effectiveLineHeight = fitScale
    ? Math.max(+(lineHeight * fitScale).toFixed(2), 1.0)
    : lineHeight;

  useEffect(() => {
    fetchSong(id).then(setSong).finally(() => setLoading(false));
  }, [id]);

  // Auto-calculate optimal fitScale
  const autoFit = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    // Temporarily measure at base fontSize/lineHeight
    const prevFS = content.style.fontSize;
    const prevLH = content.style.lineHeight;
    content.style.fontSize = `${fontSize}px`;
    content.style.lineHeight = `${lineHeight}`;

    // Force reflow and measure
    const naturalH = content.scrollHeight;
    const naturalW = content.scrollWidth;

    // Restore
    content.style.fontSize = prevFS;
    content.style.lineHeight = prevLH;

    const availH = container.clientHeight;
    const availW = container.clientWidth;

    const scale = Math.min(availH / naturalH, availW / naturalW);
    const clamped = Math.max(Math.min(scale, 2.0), 0.3);

    updateSongSettings(id, { fitScale: +clamped.toFixed(3) });
  }, [id, fontSize, lineHeight, updateSongSettings]);

  const adjustFit = useCallback((delta) => {
    const current = fitScale || 1.0;
    const next = Math.max(Math.min(current + delta, 2.0), 0.3);
    updateSongSettings(id, { fitScale: +next.toFixed(3) });
  }, [id, fitScale, updateSongSettings]);

  const resetFit = useCallback(() => {
    updateSongSettings(id, { fitScale: null });
  }, [id, updateSongSettings]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
        Загрузка...
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bg, color: colors.textMuted }}>
        Песня не найдена
      </div>
    );
  }

  const currentKey = song.key ? transposeKey(song.key, transpose) : '';

  const btnStyle = (active) => ({
    backgroundColor: active ? colors.chords : colors.bg,
    color: active ? colors.bg : colors.textMuted,
    border: `1px solid ${active ? colors.chords : colors.border}`,
  });

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

        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate text-sm">{song.title}</div>
          <div className="text-xs truncate" style={{ color: colors.textMuted }}>
            {song.artist}
            {currentKey && <span className="ml-2" style={{ color: colors.chords }}>{currentKey}</span>}
          </div>
        </div>

        {/* Transpose compact control */}
        <div className="flex items-center rounded overflow-hidden" style={{ border: `1px solid ${transpose !== 0 ? colors.chords : colors.border}` }}>
          <button
            onClick={() => updateSongSettings(id, { transpose: transpose - 1 })}
            className="px-1.5 py-1 text-xs font-mono"
            style={{
              backgroundColor: transpose !== 0 ? colors.chords : colors.bg,
              color: transpose !== 0 ? colors.bg : colors.textMuted,
              borderRight: `1px solid ${transpose !== 0 ? 'rgba(255,255,255,0.2)' : colors.border}`,
            }}
            title="Тон вниз"
          >♭</button>
          <button
            onClick={() => updateSongSettings(id, { transpose: 0 })}
            className="px-1.5 py-1 text-xs font-medium"
            style={{
              backgroundColor: transpose !== 0 ? colors.chords : colors.bg,
              color: transpose !== 0 ? colors.bg : colors.textMuted,
              minWidth: '28px',
            }}
            title={transpose !== 0 ? 'Сбросить' : 'Тональность'}
          >
            {transpose !== 0 ? (transpose > 0 ? `+${transpose}` : `${transpose}`) : '♮'}
          </button>
          <button
            onClick={() => updateSongSettings(id, { transpose: transpose + 1 })}
            className="px-1.5 py-1 text-xs font-mono"
            style={{
              backgroundColor: transpose !== 0 ? colors.chords : colors.bg,
              color: transpose !== 0 ? colors.bg : colors.textMuted,
              borderLeft: `1px solid ${transpose !== 0 ? 'rgba(255,255,255,0.2)' : colors.border}`,
            }}
            title="Тон вверх"
          >#</button>
        </div>

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
          title="Настройки просмотра"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
          </svg>
        </button>

        {/* Edit button (admin only) */}
        {isAdmin && (
          <Link to={`/admin/songs/${id}`} className="p-1.5 rounded" style={{ color: colors.textMuted }} title="Редактировать">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </Link>
        )}

        {/* Settings page link */}
        <Link to="/settings" className="p-1.5 rounded" style={{ color: colors.textMuted }} title="Настройки">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        </Link>
      </header>

      {/* Controls panel */}
      {showControls && (
        <div
          className="flex-shrink-0 px-4 py-3 space-y-3 text-sm"
          style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}
        >
          {/* Transpose */}
          <div className="flex items-center gap-2">
            <span className="w-24" style={{ color: colors.textMuted }}>Тональность</span>
            <button
              onClick={() => updateSongSettings(id, { transpose: transpose - 1 })}
              className="px-2 py-0.5 rounded font-mono"
              style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
            >−</button>
            <span className="w-8 text-center font-mono">{transpose > 0 ? '+' : ''}{transpose}</span>
            <button
              onClick={() => updateSongSettings(id, { transpose: transpose + 1 })}
              className="px-2 py-0.5 rounded font-mono"
              style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
            >+</button>
          </div>

          {/* Font size */}
          <div className="flex items-center gap-2">
            <span className="w-24" style={{ color: colors.textMuted }}>Шрифт</span>
            <input
              type="range"
              min="10"
              max="28"
              value={fontSize}
              onChange={e => updateSongSettings(id, { fontSize: +e.target.value })}
              className="flex-1"
            />
            <span className="w-8 text-center font-mono text-xs">{fontSize}</span>
          </div>

          {/* Line height */}
          <div className="flex items-center gap-2">
            <span className="w-24" style={{ color: colors.textMuted }}>Интервал</span>
            <input
              type="range"
              min="1.0"
              max="2.0"
              step="0.1"
              value={lineHeight}
              onChange={e => updateSongSettings(id, { lineHeight: +e.target.value })}
              className="flex-1"
            />
            <span className="w-8 text-center font-mono text-xs">{lineHeight}</span>
          </div>

          {/* Toggles row */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => updateSettings({ showChords: !settings.showChords })}
              className="px-2.5 py-1 rounded text-xs font-medium"
              style={btnStyle(settings.showChords)}
            >
              Аккорды
            </button>
          </div>

          {/* Auto-scroll */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => autoScroll.setOn(!autoScroll.on)}
              className="px-2.5 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: autoScroll.on ? '#4caf50' : colors.bg,
                color: autoScroll.on ? '#fff' : colors.textMuted,
                border: `1px solid ${autoScroll.on ? '#4caf50' : colors.border}`,
              }}
            >
              {autoScroll.on ? '⏸' : '▶'} Прокрутка
            </button>
            {autoScroll.on && (
              <>
                <input
                  type="range"
                  min="5"
                  max="80"
                  value={autoScroll.speed}
                  onChange={e => autoScroll.setSpeed(+e.target.value)}
                  className="flex-1"
                />
                <span className="text-xs font-mono w-6 text-right">{autoScroll.speed}</span>
              </>
            )}
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
