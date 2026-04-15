import { transposeChord, chordToH } from '../utils/transpose';

const MONO_FONT = "'Source Code Pro', 'Fira Mono', 'Courier New', monospace";

// chordStyle: 'none' | 'bg' | 'border' | 'both'
export default function SongLine({ pairs, transpose = 0, showChords = true, chordColor, chordBg, fontSize, useH = false, chordStyle = 'none' }) {
  const chordSpanStyle = {};
  if (chordStyle === 'bg' || chordStyle === 'both') {
    const bg = chordBg && chordBg !== 'transparent' ? chordBg : chordColor + '22';
    chordSpanStyle.backgroundColor = bg;
    chordSpanStyle.borderRadius = '3px';
    chordSpanStyle.padding = '2px 4px';
    chordSpanStyle.margin = '0 -4px';
  }
  if (chordStyle === 'border' || chordStyle === 'both') {
    chordSpanStyle.border = `1px solid ${chordBg && chordBg !== 'transparent' ? chordColor + '66' : chordColor + '44'}`;
    chordSpanStyle.borderRadius = '3px';
    if (!chordSpanStyle.padding) { chordSpanStyle.padding = '1px 4px'; chordSpanStyle.margin = '0 -4px'; }
  }
  const hasStyle = chordStyle !== 'none';

  return (
    <div style={{ fontFamily: MONO_FONT }}>
      {showChords && pairs.some(p => p.chord) && (
        <div
          className="whitespace-pre font-semibold select-none"
          style={{ color: chordColor, fontSize }}
        >
          {pairs.map((p, i) => {
            let chord = p.chord ? transposeChord(p.chord, transpose) : '';
            if (useH && chord) chord = chordToH(chord);
            const textLen = p.text.length;
            const chordLen = chord.length;
            const pad = chordLen < textLen ? ' '.repeat(textLen - chordLen) : ' ';

            if (chord && hasStyle) {
              return <span key={i}><span style={chordSpanStyle}>{chord}</span>{pad}</span>;
            }
            return <span key={i}>{chord + pad}</span>;
          })}
        </div>
      )}
      <div className="whitespace-pre-wrap">
        {pairs.map((p, i) => (
          <span key={i}>{p.text}</span>
        ))}
      </div>
    </div>
  );
}
