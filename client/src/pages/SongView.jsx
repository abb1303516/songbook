import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSong } from '../api/songs';
import { useSettings } from '../context/SettingsContext';
import { useAdmin } from '../context/AdminContext';
import { useSongControls } from '../context/SongControlsContext';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { transposeKey, chordToH } from '../utils/transpose';
import SongContent from '../components/SongContent';

const FIT_STEP = 0.05;

export default function SongView() {
  const { id } = useParams();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const { settings, getSongSettings, updateSongSettings } = useSettings();
  const { isAdmin } = useAdmin();
  const { registerControls, unregisterControls } = useSongControls();
  const { colors } = settings;
  const autoScroll = useAutoScroll(containerRef);

  const songSettings = getSongSettings(id);
  const { transpose, fontSize, lineHeight, fitScale } = songSettings;

  const effectiveFontSize = fitScale ? Math.max(Math.round(fontSize * fitScale), 8) : fontSize;
  const effectiveLineHeight = fitScale ? Math.max(+(lineHeight * fitScale).toFixed(2), 1.0) : lineHeight;

  useEffect(() => {
    fetchSong(id).then(setSong).finally(() => setLoading(false));
  }, [id]);

  const autoFit = useCallback(() => {
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

  // Register per-song controls for Sidebar
  useEffect(() => {
    registerControls({
      songId: id,
      transpose,
      fontSize,
      lineHeight,
      fitScale,
      scrollOn: autoScroll.on,
      scrollSpeed: autoScroll.speed,
      onTranspose: (delta) => updateSongSettings(id, { transpose: transpose + delta }),
      onFontSize: (val) => updateSongSettings(id, { fontSize: val }),
      onLineHeight: (val) => updateSongSettings(id, { lineHeight: val }),
      onAutoFit: autoFit,
      onFitReset: resetFit,
      onFitIncrease: () => adjustFit(FIT_STEP),
      onFitDecrease: () => adjustFit(-FIT_STEP),
      onScrollToggle: () => autoScroll.setOn(!autoScroll.on),
      onScrollSpeed: (val) => autoScroll.setSpeed(val),
    });
  }, [id, transpose, fontSize, lineHeight, fitScale, autoScroll.on, autoScroll.speed, registerControls, updateSongSettings, autoFit, resetFit, adjustFit]);

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

  if (!song) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: colors.textMuted }}>
        Песня не найдена
      </div>
    );
  }

  const rawKey = song.key ? transposeKey(song.key, transpose) : '';
  const currentKey = settings.useH ? chordToH(rawKey) : rawKey;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: colors.bg, color: colors.text }}>
      {/* Slim title bar */}
      <header
        className="flex-shrink-0 px-4 py-2 flex items-center gap-2"
        style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}
      >
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate text-lg">{song.title}</div>
          <div className="text-sm truncate" style={{ color: colors.textMuted }}>
            {song.artist}
            {currentKey && <span className="ml-2" style={{ color: colors.chords }}>{currentKey}</span>}
            {isAdmin && (
              <Link
                to={`/admin/songs/${id}`}
                className="ml-3 text-xs"
                style={{ color: colors.chords, opacity: 0.7 }}
              >
                Редактировать
              </Link>
            )}
          </div>
        </div>

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
