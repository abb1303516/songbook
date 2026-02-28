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
  const [fitScale, setFitScale] = useState(null); // null = no fit, number = scale factor

  const { sections } = useMemo(() => parseChordPro(chordpro || ''), [chordpro]);

  const effectiveFontSize = fitScale ? Math.max(Math.round(fontSize * fitScale), 8) : fontSize;
  const effectiveLineHeight = fitScale ? Math.max(+(lineHeight * fitScale).toFixed(2), 1.0) : lineHeight;
  const chordSize = Math.max(effectiveFontSize + chordSizeOffset * 2, 8);

  // Fit-to-screen calculation
  const recalcFit = useCallback(() => {
    if (!fitToScreen || !containerRef?.current || !contentRef.current) {
      setFitScale(null);
      return;
    }

    const container = containerRef.current;
    const content = contentRef.current;

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

    if (naturalH <= availH && naturalW <= availW) {
      setFitScale(null);
      return;
    }

    const scale = Math.min(availH / naturalH, availW / naturalW);
    setFitScale(Math.max(scale, 0.3));
  }, [fitToScreen, containerRef, fontSize, lineHeight]);

  useEffect(() => {
    recalcFit();
  }, [recalcFit, chordSizeOffset, transpose, showChords, mono, chordpro]);

  // Recalculate on window resize
  useEffect(() => {
    if (!fitToScreen) return;
    const handleResize = () => recalcFit();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitToScreen, recalcFit]);

  return (
    <div ref={contentRef} style={{ fontSize: effectiveFontSize, lineHeight: effectiveLineHeight }}>
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
