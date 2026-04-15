import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchSong, fetchSetlist, updateSongTranspose } from '../api/songs';
import { useSettings } from '../context/SettingsContext';
import { useSongs } from '../context/SongsContext';
import { useSongControls } from '../context/SongControlsContext';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { transposeKey, chordToH } from '../utils/transpose';
import SongContent from '../components/SongContent';
import SongMenu from '../components/SongMenu';

const FIT_STEP = 0.05;

export default function SongView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoverLeft, setHoverLeft] = useState(false);
  const [hoverRight, setHoverRight] = useState(false);
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const { settings, updateSettings, getSongSettings, updateSongSettings } = useSettings();
  const { songs, setlists, navList, setNavList, reload } = useSongs();
  const { registerControls, unregisterControls } = useSongControls();
  const { colors } = settings;
  const autoScroll = useAutoScroll(containerRef);

  // Transpose from song (server), fontSize/lineHeight from settings (server), fitScale from local
  const transpose = song?.transpose || 0;
  const { fontSize, lineHeight } = settings;
  const localSongSettings = getSongSettings(id);
  const { fitScale } = localSongSettings;

  const effectiveFontSize = fitScale ? Math.max(Math.round(fontSize * fitScale), 8) : fontSize;
  const effectiveLineHeight = fitScale ? Math.max(+(lineHeight * fitScale).toFixed(2), 1.0) : lineHeight;

  // Load song data
  useEffect(() => {
    setLoading(true);
    fetchSong(id).then(setSong).finally(() => setLoading(false));
  }, [id]);

  // If coming from setlist, populate navList with setlist songs
  const setlistId = searchParams.get('setlist');
  useEffect(() => {
    if (setlistId) {
      fetchSetlist(setlistId).then(sl => {
        if (sl?.songs) setNavList(sl.songs.map(s => s.id));
      }).catch(() => {});
    }
  }, [setlistId, setNavList]);

  // Navigation
  const currentIdx = navList.indexOf(id);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < navList.length - 1;

  const goTo = (idx) => {
    const nextId = navList[idx];
    if (nextId) {
      autoScroll.setOn(false);
      const params = setlistId ? `?setlist=${setlistId}` : '';
      navigate(`/song/${nextId}${params}`);
    }
  };

  // Fit-to-screen
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
      onTranspose: (delta) => {
        const newT = transpose + delta;
        setSong(prev => prev ? { ...prev, transpose: newT } : prev);
        updateSongTranspose(id, newT).catch(() => {});
      },
      onFontSize: (val) => updateSettings({ fontSize: val }),
      onLineHeight: (val) => updateSettings({ lineHeight: val }),
      onAutoFit: autoFit,
      onFitReset: resetFit,
      onFitIncrease: () => adjustFit(FIT_STEP),
      onFitDecrease: () => adjustFit(-FIT_STEP),
      onScrollToggle: () => autoScroll.setOn(!autoScroll.on),
      onScrollSpeed: (val) => autoScroll.setSpeed(val),
    });
  }, [id, transpose, fontSize, lineHeight, fitScale, autoScroll.on, autoScroll.speed, registerControls, updateSettings, autoFit, resetFit, adjustFit]);

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

  const songStatus = song.status || 'new';

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: colors.bg, color: colors.text }}>
      {/* One-line header: Artist — Title [⋮] */}
      <header
        className="flex-shrink-0 px-4 py-1.5 flex items-center gap-2"
        style={{ backgroundColor: colors.surface, borderBottom: `1px solid ${colors.border}` }}
      >
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          {/* Clickable artist → filter */}
          {song.artist && (
            <>
              <button
                onClick={() => navigate(`/?artist=${encodeURIComponent(song.artist)}`)}
                className="text-sm truncate cursor-pointer hover:underline flex-shrink-0"
                style={{ color: colors.textMuted, maxWidth: '40%' }}
                title={`Все песни: ${song.artist}`}
              >
                {song.artist}
              </button>
              <span className="text-sm" style={{ color: colors.border }}>—</span>
            </>
          )}
          <span className="font-semibold truncate text-sm">{song.title}</span>
        </div>

        {/* Three-dot menu */}
        <SongMenu
          songId={id}
          songStatus={songStatus}
          onStatusChange={(s) => setSong(prev => ({ ...prev, status: s }))}
        />
      </header>

      {/* Song content with gallery arrows */}
      <div ref={containerRef} className="flex-1 overflow-auto relative">
        {/* Left arrow */}
        {hasPrev && (
          <div
            className="absolute left-0 top-0 bottom-0 w-12 z-10 flex items-center justify-center cursor-pointer transition-opacity"
            style={{ opacity: hoverLeft ? 1 : 0, background: `linear-gradient(to right, ${colors.bg}cc, transparent)` }}
            onMouseEnter={() => setHoverLeft(true)}
            onMouseLeave={() => setHoverLeft(false)}
            onClick={() => goTo(currentIdx - 1)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </div>
        )}

        {/* Right arrow */}
        {hasNext && (
          <div
            className="absolute right-0 top-0 bottom-0 w-12 z-10 flex items-center justify-center cursor-pointer transition-opacity"
            style={{ opacity: hoverRight ? 1 : 0, background: `linear-gradient(to left, ${colors.bg}cc, transparent)` }}
            onMouseEnter={() => setHoverRight(true)}
            onMouseLeave={() => setHoverRight(false)}
            onClick={() => goTo(currentIdx + 1)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        )}

        <div ref={contentRef} className="px-4 py-4">
          <SongContent
            chordpro={song.chordpro}
            transpose={transpose}
            showChords={settings.showChords}
            fontSize={effectiveFontSize}
            lineHeight={effectiveLineHeight}
            chordColor={colors.chords}
            useH={settings.useH}
            colors={colors}
          />
        </div>
      </div>
    </div>
  );
}
