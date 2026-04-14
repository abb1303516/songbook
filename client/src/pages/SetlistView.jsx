import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { fetchSetlist } from '../api/songs';
import { useSettings } from '../context/SettingsContext';
import { useAdmin } from '../context/AdminContext';
import { useSongControls } from '../context/SongControlsContext';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { transposeKey, chordToH } from '../utils/transpose';
import SongContent from '../components/SongContent';

const FIT_STEP = 0.05;

export default function SetlistView() {
  const { id } = useParams();
  const [setlist, setSetlist] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const { settings, getSongSettings, updateSongSettings } = useSettings();
  const { isAdmin } = useAdmin();
  const { registerControls, unregisterControls } = useSongControls();
  const { colors } = settings;
  const autoScroll = useAutoScroll(containerRef);

  useEffect(() => {
    fetchSetlist(id).then(setSetlist).finally(() => setLoading(false));
  }, [id]);

  const song = setlist?.songs?.[currentIdx];
  const songSettings = getSongSettings(song?.id || '');
  const { transpose, fontSize, lineHeight, fitScale } = songSettings;

  const effectiveFontSize = fitScale ? Math.max(Math.round(fontSize * fitScale), 8) : fontSize;
  const effectiveLineHeight = fitScale ? Math.max(+(lineHeight * fitScale).toFixed(2), 1.0) : lineHeight;

  const goTo = (idx) => {
    setCurrentIdx(idx);
    autoScroll.setOn(false);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  };

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

  // Register per-song controls for Sidebar
  useEffect(() => {
    if (!song) return;
    registerControls({
      songId: song.id,
      transpose,
      fontSize,
      lineHeight,
      fitScale,
      scrollOn: autoScroll.on,
      scrollSpeed: autoScroll.speed,
      onTranspose: (delta) => updateSongSettings(song.id, { transpose: transpose + delta }),
      onFontSize: (val) => updateSongSettings(song.id, { fontSize: val }),
      onLineHeight: (val) => updateSongSettings(song.id, { lineHeight: val }),
      onAutoFit: autoFit,
      onFitReset: resetFit,
      onFitIncrease: () => adjustFit(FIT_STEP),
      onFitDecrease: () => adjustFit(-FIT_STEP),
      onScrollToggle: () => autoScroll.setOn(!autoScroll.on),
      onScrollSpeed: (val) => autoScroll.setSpeed(val),
    });
  }, [song, transpose, fontSize, lineHeight, fitScale, autoScroll.on, autoScroll.speed, registerControls, updateSongSettings, autoFit, resetFit, adjustFit]);

  useEffect(() => {
    return () => unregisterControls();
  }, [unregisterControls]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: colors.textMuted }}>
        Загрузка...
      </div>
    );
  }

  if (!setlist) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: colors.textMuted }}>
        Сет-лист не найден
      </div>
    );
  }

  if (!song) {
    return (
      <div className="flex-1 flex flex-col">
        <header className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}>
          <div className="font-semibold">{setlist.name}</div>
        </header>
        <div className="flex-1 flex items-center justify-center" style={{ color: colors.textMuted }}>
          В этом сет-листе нет песен
        </div>
      </div>
    );
  }

  const rawKey = song.key ? transposeKey(song.key, transpose) : '';
  const currentKey = settings.useH ? chordToH(rawKey) : rawKey;
  const total = setlist.songs.length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: colors.bg, color: colors.text }}>
      {/* Slim title bar with prev/next */}
      <header
        className="flex-shrink-0 px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}
      >
        {/* Prev */}
        <button
          onClick={() => goTo(currentIdx - 1)}
          disabled={currentIdx === 0}
          className="p-2 rounded disabled:opacity-30 cursor-pointer flex-shrink-0"
          style={{ color: colors.text, border: `1px solid ${colors.border}` }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
        </button>

        <div className="overflow-hidden" style={{ width: 'min(400px, 50vw)' }}>
          <div className="font-semibold truncate text-lg">{song.title}</div>
          <div className="text-sm truncate" style={{ color: colors.textMuted }}>
            {song.artist}
          </div>
          <div className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
            {setlist.name} — {currentIdx + 1}/{total}
          </div>
        </div>

        {/* Next */}
        <button
          onClick={() => goTo(currentIdx + 1)}
          disabled={currentIdx === total - 1}
          className="p-2 rounded disabled:opacity-30 cursor-pointer flex-shrink-0"
          style={{ color: colors.text, border: `1px solid ${colors.border}` }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </button>

      </header>

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
            useH={settings.useH}
            colors={colors}
          />
        </div>
      </div>
    </div>
  );
}
