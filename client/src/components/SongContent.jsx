import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { parseChordPro } from '../utils/chordpro';
import SongLine from './SongLine';

export default function SongContent({
  chordpro,
  transpose = 0,
  showChords = true,
  fontSize = 16,
  lineHeight = 1.4,
  chordColor = '#6bb3ff',
  chordSizeOffset = 0,
  mono = false,
  fitToScreen = false,
  colors = {},
  containerRef,
}) {
  const contentRef = useRef(null);
  const [fittedFontSize, setFittedFontSize] = useState(null);

  const { sections } = useMemo(() => parseChordPro(chordpro || ''), [chordpro]);

  const chordSize = Math.max((fittedFontSize || fontSize) + chordSizeOffset * 2, 8);

  // Fit-to-screen: binary search for optimal fontSize
  const recalcFit = useCallback(() => {
    if (!fitToScreen || !containerRef?.current || !contentRef.current) {
      setFittedFontSize(null);
      return;
    }

    // Need a small delay to let the DOM render at base size first
    requestAnimationFrame(() => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;

      const availH = container.clientHeight - 32; // padding
      const availW = container.clientWidth - 32;

      // Temporarily reset to measure natural size at base fontSize
      const origFontSize = content.style.fontSize;
      content.style.fontSize = `${fontSize}px`;

      const naturalH = content.scrollHeight;
      const naturalW = content.scrollWidth;

      content.style.fontSize = origFontSize;

      if (naturalH <= availH && naturalW <= availW) {
        // Already fits, no change needed
        setFittedFontSize(null);
        return;
      }

      // Scale fontSize proportionally
      const scaleH = availH / naturalH;
      const scaleW = availW / naturalW;
      const scale = Math.min(scaleH, scaleW, 1);
      const newSize = Math.max(Math.floor(fontSize * scale), 8);

      if (newSize < fontSize) {
        setFittedFontSize(newSize);
      } else {
        setFittedFontSize(null);
      }
    });
  }, [fitToScreen, containerRef, fontSize]);

  useEffect(() => {
    recalcFit();
  }, [recalcFit, chordSizeOffset, transpose, showChords, mono, lineHeight, chordpro]);

  // Recalculate on window resize
  useEffect(() => {
    if (!fitToScreen) return;
    const handleResize = () => recalcFit();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitToScreen, recalcFit]);

  const effectiveFontSize = fittedFontSize || fontSize;

  return (
    <div ref={contentRef} style={{ fontSize: effectiveFontSize, lineHeight }}>
      {sections.map((section, si) => {
        if (section.type === 'comment') {
          return (
            <div key={si} className="italic my-2" style={{ color: colors.textMuted || '#888' }}>
              {section.lines[0]?.pairs[0]?.text}
            </div>
          );
        }

        const isChorus = section.type === 'chorus';
        const isBridge = section.type === 'bridge';
        const sectionStyle = {};
        let sectionClass = 'mb-4';

        if (isChorus) {
          sectionStyle.backgroundColor = colors.chorusBg || 'rgba(255,255,255,0.05)';
          sectionStyle.borderLeft = `3px solid ${colors.chorusBorder || 'rgba(255,255,255,0.15)'}`;
          sectionClass += ' pl-3 py-1 rounded-r';
        } else if (isBridge) {
          sectionStyle.backgroundColor = colors.bridgeBg || 'rgba(255,255,255,0.03)';
          sectionStyle.borderLeft = `2px solid ${colors.bridgeBorder || 'rgba(255,255,255,0.08)'}`;
          sectionClass += ' pl-3 py-1 rounded-r';
        }

        return (
          <div key={si} className={sectionClass} style={sectionStyle}>
            {section.label && (
              <div
                className="text-xs uppercase tracking-wider mb-1 font-semibold"
                style={{ color: colors.textMuted || '#888', fontSize: effectiveFontSize * 0.7 }}
              >
                {section.label}
              </div>
            )}
            {section.lines.map((line, li) => (
              <SongLine
                key={li}
                pairs={line.pairs}
                transpose={transpose}
                showChords={showChords}
                chordColor={chordColor}
                chordSize={chordSize}
                mono={mono}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
