import { transposeChord, chordToH } from '../utils/transpose';

const MONO_FONT = "'Source Code Pro', 'Fira Mono', 'Courier New', monospace";

export default function SongLine({ pairs, transpose = 0, showChords = true, chordColor, fontSize, useH = false }) {
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
            const padded = chord + (chordLen < textLen ? ' '.repeat(textLen - chordLen) : ' ');
            return <span key={i}>{padded}</span>;
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
