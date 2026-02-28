import { transposeChord } from '../utils/transpose';

export default function SongLine({ pairs, transpose = 0, showChords = true, chordColor, chordSize, mono }) {
  const fontFamily = mono
    ? "'Source Code Pro', 'Fira Mono', 'Courier New', monospace"
    : "'Source Sans 3', 'Segoe UI', system-ui, sans-serif";

  return (
    <div style={{ fontFamily }}>
      {showChords && pairs.some(p => p.chord) && (
        <div
          className="whitespace-pre font-semibold select-none"
          style={{ color: chordColor, fontSize: chordSize }}
        >
          {pairs.map((p, i) => {
            const chord = p.chord ? transposeChord(p.chord, transpose) : '';
            // Pad chord to match text width below
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
