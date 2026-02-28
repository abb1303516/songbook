import { useMemo } from 'react';
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
  useH = false,
  colors = {},
}) {
  const { sections } = useMemo(() => parseChordPro(chordpro || ''), [chordpro]);

  const chordSize = Math.max(fontSize + chordSizeOffset * 2, 8);

  return (
    <div style={{ fontSize, lineHeight }}>
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
                style={{ color: colors.textMuted || '#888', fontSize: fontSize * 0.7 }}
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
                useH={useH}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
