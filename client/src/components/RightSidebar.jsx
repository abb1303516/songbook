import { useState, useMemo, useRef, useEffect } from 'react';
import Chord from '@tombatossals/react-chords/lib/Chord';
import { useRightSidebar, MIN_RIGHT_WIDTH, MAX_RIGHT_WIDTH, MIN_CHORD_SIZE, MAX_CHORD_SIZE } from '../context/RightSidebarContext';
import { useSettings } from '../context/SettingsContext';
import { extractChords, findChord, GUITAR_INSTRUMENT } from '../utils/chordDiagram';
import { transposeChord, chordToH } from '../utils/transpose';
import { youtubeEmbedUrl } from '../utils/youtube';

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Single chord diagram — cycles through available positions on click
function ChordCard({ chordName, colors }) {
  const [posIdx, setPosIdx] = useState(0);
  const entry = useMemo(() => findChord(chordName), [chordName]);

  if (!entry) {
    return (
      <div className="flex flex-col items-center p-2" style={{ border: `1px solid ${colors.border}`, borderRadius: 4 }}>
        <div className="font-semibold text-sm" style={{ color: colors.chords }}>{chordName}</div>
        <div className="text-xs mt-2" style={{ color: colors.textMuted }}>не найден</div>
      </div>
    );
  }

  const pos = entry.positions[posIdx] || entry.positions[0];
  const total = entry.positions.length;

  return (
    <div
      className="flex flex-col items-center p-2 cursor-pointer"
      style={{ border: `1px solid ${colors.border}`, borderRadius: 4 }}
      onClick={() => setPosIdx((posIdx + 1) % total)}
      title={total > 1 ? 'Другой вариант' : ''}
    >
      <div className="font-semibold text-sm mb-1" style={{ color: colors.chords }}>{chordName}</div>
      <div
        className="chord-diagram"
        style={{ width: '100%', '--chord-diagram-color': colors.text }}
      >
        <Chord chord={pos} instrument={GUITAR_INSTRUMENT} lite={false} />
      </div>
      {total > 1 && (
        <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
          {posIdx + 1} / {total}
        </div>
      )}
    </div>
  );
}

export default function RightSidebar({ chordpro, transpose = 0, youtubeUrls = [] }) {
  const { isOpen, isMobile, close, width, setWidth, chordSize, setChordSize } = useRightSidebar();
  const { settings } = useSettings();
  const { colors } = settings;
  const [ytIdx, setYtIdx] = useState(0);
  const [chordsOpen, setChordsOpen] = useState(true);
  const [playerOpen, setPlayerOpen] = useState(true);
  const resizingRef = useRef(false);

  // Resize: attach listeners on mount, check ref inside
  useEffect(() => {
    const onMove = (e) => {
      if (!resizingRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.min(Math.max(newWidth, MIN_RIGHT_WIDTH), MAX_RIGHT_WIDTH));
    };
    const onUp = () => { resizingRef.current = false; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [setWidth]);

  const startResize = (e) => {
    e.preventDefault();
    resizingRef.current = true;
    document.body.style.userSelect = 'none';
  };

  const uniqueChords = useMemo(() => {
    const raw = extractChords(chordpro);
    // Apply transpose and useH
    return raw.map(c => {
      let t = transpose ? transposeChord(c, transpose) : c;
      if (settings.useH) t = chordToH(t);
      return t;
    });
  }, [chordpro, transpose, settings.useH]);

  const validYtUrls = (youtubeUrls || []).filter(u => u && youtubeEmbedUrl(u));

  if (!isOpen) return null;

  const effectiveWidth = isMobile ? Math.min(window.innerWidth - 40, 360) : width;

  return (
    <>
      {isMobile && (
        <div className="fixed inset-0 z-30 bg-black/50" onClick={close} />
      )}
      <aside
        className="fixed top-0 right-0 h-screen flex flex-col z-40"
        style={{
          width: effectiveWidth,
          backgroundColor: colors.surface,
          borderLeft: `1px solid ${colors.border}`,
          color: colors.text,
        }}
      >
        {/* Resize handle — desktop only */}
        {!isMobile && (
          <div
            onMouseDown={startResize}
            className="absolute top-0 bottom-0 left-0 w-1 cursor-ew-resize z-50"
            style={{ marginLeft: -3 }}
            title="Перетащите для изменения ширины"
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <div className="font-bold text-sm">Инструменты</div>
          <button onClick={close} className="p-1 rounded cursor-pointer" style={{ color: colors.textMuted }} title="Закрыть">
            <IconClose />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Chord diagrams */}
          <div className="px-3 py-2" style={{ borderBottom: `1px solid ${colors.border}` }}>
            <button
              onClick={() => setChordsOpen(!chordsOpen)}
              className="flex items-center justify-between w-full text-sm font-medium cursor-pointer"
              style={{ color: colors.text }}
            >
              <span>Аккорды ({uniqueChords.length})</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: chordsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            {chordsOpen && uniqueChords.length > 0 && (
              <>
                {/* Size controls */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs" style={{ color: colors.textMuted }}>Размер</span>
                  <button
                    onClick={() => setChordSize(Math.max(chordSize - 20, MIN_CHORD_SIZE))}
                    disabled={chordSize <= MIN_CHORD_SIZE}
                    className="px-2.5 py-0.5 rounded font-mono text-sm cursor-pointer disabled:opacity-40"
                    style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
                  >−</button>
                  <button
                    onClick={() => setChordSize(Math.min(chordSize + 20, MAX_CHORD_SIZE))}
                    disabled={chordSize >= MAX_CHORD_SIZE}
                    className="px-2.5 py-0.5 rounded font-mono text-sm cursor-pointer disabled:opacity-40"
                    style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
                  >+</button>
                </div>
                <div
                  className="gap-2 mt-2"
                  style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${chordSize}px, 1fr))` }}
                >
                  {uniqueChords.map((c, i) => (
                    <ChordCard key={`${c}-${i}`} chordName={c} colors={colors} />
                  ))}
                </div>
              </>
            )}
            {chordsOpen && uniqueChords.length === 0 && (
              <div className="text-xs py-2" style={{ color: colors.textMuted }}>В песне нет аккордов</div>
            )}
          </div>

          {/* YouTube player */}
          <div className="px-3 py-2">
            <button
              onClick={() => setPlayerOpen(!playerOpen)}
              className="flex items-center justify-between w-full text-sm font-medium cursor-pointer"
              style={{ color: colors.text }}
            >
              <span>YouTube {validYtUrls.length > 0 ? `(${validYtUrls.length})` : ''}</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: playerOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            {playerOpen && validYtUrls.length > 0 && (
              <div className="mt-2">
                {validYtUrls.length > 1 && (
                  <div className="flex gap-1 mb-2 flex-wrap">
                    {validYtUrls.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setYtIdx(i)}
                        className="px-2 py-0.5 rounded text-xs cursor-pointer"
                        style={{
                          backgroundColor: ytIdx === i ? colors.accent : 'transparent',
                          color: ytIdx === i ? colors.bg : colors.textMuted,
                          border: `1px solid ${ytIdx === i ? colors.accent : colors.border}`,
                        }}
                      >
                        {i === 0 ? 'Оригинал' : `Разбор ${i}`}
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src={youtubeEmbedUrl(validYtUrls[ytIdx] || validYtUrls[0])}
                    title="YouTube player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, borderRadius: 4 }}
                  />
                </div>
              </div>
            )}
            {playerOpen && validYtUrls.length === 0 && (
              <div className="text-xs py-2" style={{ color: colors.textMuted }}>Ссылки на YouTube не заданы</div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
