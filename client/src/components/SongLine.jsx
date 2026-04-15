import { transposeChord, chordToH } from '../utils/transpose';

const MONO_FONT = "'Source Code Pro', 'Fira Mono', 'Courier New', monospace";

// chordStyle: 'none' | 'bg' | 'border' | 'both'
export default function SongLine({ pairs, transpose = 0, showChords = true, chordColor, fontSize, useH = false, chordStyle = 'none' }) {
  const chordSpanStyle = {};
  if (chordStyle === 'bg' || chordStyle === 'both') {
    chordSpanStyle.backgroundColor = chordColor + '22'; // ~13% opacity
    chordSpanStyle.borderRadius = '2px';
    chordSpanStyle.padding = '1px 2px';
    chordSpanStyle.margin = '0 -2px'; // compensate horizontal padding
  }
  if (chordStyle === 'border' || chordStyle === 'both') {
    chordSpanStyle.border = `1px solid ${chordColor}44`;
    chordSpanStyle.borderRadius = '3px';
    chordSpanStyle.padding = '0px 2px';
    chordSpanStyle.margin = '0 -2px';
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
