import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchSong, fetchSetlist, updateSongStatus, updateSetlist, deleteSong } from '../api/songs';
import { useSettings } from '../context/SettingsContext';
import { useAdmin } from '../context/AdminContext';
import { useSongs } from '../context/SongsContext';
import { useSongControls } from '../context/SongControlsContext';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { transposeKey, chordToH } from '../utils/transpose';
import SongContent from '../components/SongContent';

const FIT_STEP = 0.05;
const STATUS_CYCLE = ['new', 'learning', 'known'];
const STATUS_LABELS = { new: 'Новые', learning: 'Учу', known: 'Знаю' };

export default function SongView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoverLeft, setHoverLeft] = useState(false);
  const [hoverRight, setHoverRight] = useState(false);
  const menuRef = useRef(null);
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const { settings, getSongSettings, updateSongSettings } = useSettings();
  const { isAdmin } = useAdmin();
  const { songs, setlists, navList, setNavList, reload } = useSongs();
  const { registerControls, unregisterControls } = useSongControls();
  const { colors } = settings;
  const autoScroll = useAutoScroll(containerRef);

  const songSettings = getSongSettings(id);
  const { transpose, fontSize, lineHeight, fitScale } = songSettings;

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

  // Close menu on click outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

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
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded cursor-pointer"
            style={{ color: colors.textMuted }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          {menuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 top-8 z-50 rounded-lg py-1 min-w-[180px]"
              style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
            >
              {/* Edit */}
              {isAdmin && (
                <button
                  onClick={() => { setMenuOpen(false); navigate(`/admin/songs/${id}`); }}
                  className="block w-full text-left px-3 py-1.5 text-xs hover:opacity-80"
                  style={{ color: colors.text }}
                >
                  Редактировать
                </button>
              )}

              {/* Status */}
              <div className="px-3 py-1 text-xs" style={{ color: colors.textMuted }}>Статус:</div>
              {STATUS_CYCLE.map(s => (
                <button
                  key={s}
                  onClick={async () => {
                    try {
                      await updateSongStatus(id, s);
                      setSong(prev => ({ ...prev, status: s }));
                      reload();
                    } catch (e) { /* ignore */ }
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-xs hover:opacity-80"
                  style={{ color: songStatus === s ? colors.chords : colors.text }}
                >
                  {songStatus === s ? '✓ ' : '  '}{STATUS_LABELS[s]}
                </button>
              ))}

              {/* Setlists */}
              {setlists.length > 0 && (
                <>
                  <div className="px-3 py-1 text-xs mt-1" style={{ color: colors.textMuted, borderTop: `1px solid ${colors.border}` }}>Сет-листы:</div>
                  {setlists.map(sl => {
                    const inList = (sl.song_ids || []).includes(id);
                    return (
                      <button
                        key={sl.id}
                        onClick={async () => {
                          const ids = sl.song_ids || [];
                          try {
                            if (inList) {
                              await updateSetlist(sl.id, { song_ids: ids.filter(i => i !== id) });
                            } else {
                              await updateSetlist(sl.id, { song_ids: [...ids, id] });
                            }
                            reload();
                          } catch (e) { /* ignore */ }
                          setMenuOpen(false);
                        }}
                        className="block w-full text-left px-3 py-1.5 text-xs hover:opacity-80"
                        style={{ color: inList ? colors.chords : colors.text }}
                      >
                        {inList ? '✓ ' : '  '}{sl.name}
                      </button>
                    );
                  })}
                </>
              )}

              {/* Delete */}
              {isAdmin && (
                <button
                  onClick={async () => {
                    if (!confirm('Удалить песню?')) return;
                    try {
                      await deleteSong(id);
                      reload();
                      navigate('/');
                    } catch (e) { alert(e.message); }
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-xs mt-1 hover:opacity-80"
                  style={{ color: '#e05555', borderTop: `1px solid ${colors.border}` }}
                >
                  Удалить
                </button>
              )}
            </div>
          )}
        </div>
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
