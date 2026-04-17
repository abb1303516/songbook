import { transposeChord, chordToH } from '../utils/transpose';

const MONO_FONT = "'Source Code Pro', 'Fira Mono', 'Courier New', monospace";

// chordStyle: 'none' | 'bg' | 'border' | 'both'
export default function SongLine({ pairs, transpose = 0, showChords = true, chordColor, chordBg, fontSize, useH = false, chordStyle = 'none' }) {
  const chordSpanStyle = { display: 'inline-block' };
  if (chordStyle === 'bg' || chordStyle === 'both') {
    const bg = chordBg && chordBg !== 'transparent' ? chordBg : chordColor + '22';
    chordSpanStyle.backgroundColor = bg;
    chordSpanStyle.borderRadius = '3px';
    chordSpanStyle.padding = '0px 4px';
  }
  if (chordStyle === 'border' || chordStyle === 'both') {
    chordSpanStyle.border = `1px solid ${chordBg && chordBg !== 'transparent' ? chordColor + '66' : chordColor + '44'}`;
    chordSpanStyle.borderRadius = '3px';
    if (!chordSpanStyle.padding) chordSpanStyle.padding = '1px 4px';
  }

  const hasAnyChord = pairs.some(p => p.chord);
  const showChordRow = showChords && hasAnyChord;

  return (
    <div style={{ fontFamily: MONO_FONT, fontSize }}>
      {pairs.map((p, i) => {
        let chord = p.chord ? transposeChord(p.chord, transpose) : '';
        if (useH && chord) chord = chordToH(chord);

        // Each pair: inline-block, text wraps by words, chord stays above first word
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              verticalAlign: 'top',
              wordSpacing: 'normal',
            }}
          >
            {showChordRow && (
              <span
                className="font-semibold select-none"
                style={{ color: chordColor, display: 'block', whiteSpace: 'pre', minHeight: '1em' }}
              >
                {chord ? <span style={chordSpanStyle}>{chord}</span> : '\u00A0'}
              </span>
            )}
            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'normal', overflowWrap: 'break-word' }}>{p.text}</span>
          </span>
        );
      })}
    </div>
  );
}
