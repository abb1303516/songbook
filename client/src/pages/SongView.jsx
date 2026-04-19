import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchSong, fetchSetlist, updateSongTranspose } from '../api/songs';
import { useSettings } from '../context/SettingsContext';
import { useSongs } from '../context/SongsContext';
import { useSongControls } from '../context/SongControlsContext';
import { useRightSidebar } from '../context/RightSidebarContext';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { transposeKey, chordToH } from '../utils/transpose';
import SongContent from '../components/SongContent';
import SongMenu from '../components/SongMenu';
import RightSidebar from '../components/RightSidebar';

const FIT_STEP = 0.05;

export default function SongView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasTouch] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const { settings, updateSettings, getSongSettings, updateSongSettings } = useSettings();
  const { songs, setlists, navList, setNavList, reload } = useSongs();
  const { registerControls, unregisterControls } = useSongControls();
  const rightSidebar = useRightSidebar();
  const { colors } = settings;
  const autoScroll = useAutoScroll(containerRef);

  // Transpose from song (server), fontSize/lineHeight from settings (server), fitScale from local
  const transpose = song?.transpose || 0;
  const { fontSize } = settings;
  const localSongSettings = getSongSettings(id);
  const { fitScale } = localSongSettings;
  // lineHeight: per-song per-device, fallback to global
  const lineHeight = localSongSettings.lineHeight ?? settings.lineHeight ?? 1.4;

  const effectiveFontSize = fitScale ? Math.max(Math.round(fontSize * fitScale), 8) : fontSize;
  const effectiveLineHeight = fitScale ? Math.max(+(lineHeight * fitScale).toFixed(2), 0.7) : lineHeight;

  // Load song data
  useEffect(() => {
    setLoading(true);
    fetchSong(id).then(setSong).finally(() => setLoading(false));
  }, [id]);

  // Populate navList from setlist or all songs
  const setlistId = searchParams.get('setlist');
  useEffect(() => {
    if (setlistId) {
      fetchSetlist(setlistId).then(sl => {
        if (sl?.songs) setNavList(sl.songs.map(s => s.id));
      }).catch(() => {});
    } else if (!navList.includes(id) && songs.length > 0) {
      // Current song not in navList (e.g. direct URL) — use all songs
      setNavList(songs.map(s => s.id));
    }
  }, [setlistId, setNavList, id, songs]);

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
    updateSongSettings(id, prev => {
      const current = prev.fitScale || 1.0;
      const next = Math.max(Math.min(current + delta, 2.0), 0.3);
      return { fitScale: +next.toFixed(3) };
    });
  }, [id, updateSongSettings]);

  const resetFit = useCallback(() => {
    updateSongSettings(id, { fitScale: null });
  }, [id, updateSongSettings]);

  // Register per-song controls for Sidebar
  const columns = localSongSettings.columns || 1;

  useEffect(() => {
    registerControls({
      songId: id,
      transpose,
      fontSize,
      lineHeight,
      fitScale,
      columns,
      scrollOn: autoScroll.on,
      scrollSpeed: autoScroll.speed,
      onTranspose: (delta) => {
        setSong(prev => {
          if (!prev) return prev;
          let newT = (prev.transpose || 0) + delta;
          if (newT === 12 || newT === -12) newT = 0;
          updateSongTranspose(id, newT).catch(() => {});
          return { ...prev, transpose: newT };
        });
      },
      onFontSize: (val) => updateSettings({ fontSize: val }),
      onLineHeight: (val) => updateSongSettings(id, { lineHeight: val }),
      onAutoFit: autoFit,
      onFitReset: resetFit,
      onFitIncrease: () => adjustFit(FIT_STEP),
      onFitDecrease: () => adjustFit(-FIT_STEP),
      onColumns: () => {
        updateSongSettings(id, prev => {
          const cur = prev.columns || 1;
          return { columns: cur >= 3 ? 1 : cur + 1 };
        });
      },
      onScrollToggle: () => autoScroll.setOn(!autoScroll.on),
      onScrollSpeed: (val) => autoScroll.setSpeed(val),
    });
  }, [id, transpose, fontSize, lineHeight, fitScale, columns, autoScroll.on, autoScroll.speed, registerControls, updateSettings, updateSongSettings, autoFit, resetFit, adjustFit]);

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

        {/* Tools panel toggle */}
        <button
          onClick={rightSidebar.toggle}
          className="p-1.5 rounded cursor-pointer flex-shrink-0"
          style={{ color: rightSidebar.isOpen ? colors.accent : colors.textMuted }}
          title="Аккорды и плеер"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        </button>

        {/* Three-dot menu */}
        <SongMenu
          songId={id}
          songStatus={songStatus}
          onStatusChange={(s) => setSong(prev => ({ ...prev, status: s }))}
        />
      </header>

      {/* Song content with gallery arrows */}
      <div className="flex-1 relative overflow-hidden">
        {/* Left arrow — hover zone, hidden on touch devices */}
        {hasPrev && !hasTouch && (
          <div
            className="gallery-arrow absolute left-0 top-0 bottom-0 w-32 z-10 flex items-center justify-center cursor-pointer"
            onClick={() => goTo(currentIdx - 1)}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </div>
          </div>
        )}

        {/* Right arrow */}
        {hasNext && !hasTouch && (
          <div
            className="gallery-arrow absolute right-0 top-0 bottom-0 w-32 z-10 flex items-center justify-center cursor-pointer"
            onClick={() => goTo(currentIdx + 1)}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="h-full overflow-y-auto overflow-x-hidden"
          onTouchStart={(e) => {
            const t = e.touches[0];
            containerRef.current._touchStart = { x: t.clientX, y: t.clientY };
          }}
          onTouchEnd={(e) => {
            const start = containerRef.current._touchStart;
            if (!start) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - start.x;
            const dy = t.clientY - start.y;
            // Horizontal swipe with minimum distance, mostly horizontal
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
              if (dx > 0 && hasPrev) goTo(currentIdx - 1);
              else if (dx < 0 && hasNext) goTo(currentIdx + 1);
            }
            containerRef.current._touchStart = null;
          }}
        >
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
            columns={localSongSettings.columns || 1}
            chordStyle={settings.chordStyle || 'none'}
          />
        </div>
        </div>
      </div>

      {/* Right sidebar — chord diagrams + YouTube */}
      <RightSidebar
        chordpro={song.chordpro}
        transpose={transpose}
        youtubeUrls={song.youtube_urls || []}
        youtubeLabels={song.youtube_labels || []}
      />
    </div>
  );
}
