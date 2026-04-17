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

  // Split pair text into words for independent wrapping
  // Each word becomes its own inline-block "mini pair" — first word carries the chord
  const renderPair = (p, pairIdx) => {
    let chord = p.chord ? transposeChord(p.chord, transpose) : '';
    if (useH && chord) chord = chordToH(chord);

    // Split text into [whitespace, word, whitespace, word...] keeping separators
    const tokens = p.text.match(/(\s+|\S+)/g) || [p.text];
    let firstWordRendered = false;

    return tokens.map((token, ti) => {
      const isWord = /\S/.test(token);
      const key = `${pairIdx}-${ti}`;

      if (!isWord) {
        // Whitespace: render as regular text node so wrap can happen here
        return <span key={key} style={{ whiteSpace: 'pre-wrap' }}>{token}</span>;
      }

      const showChordHere = showChordRow && !firstWordRendered && chord;
      if (!firstWordRendered) firstWordRendered = true;

      return (
        <span key={key} style={{ display: 'inline-block', verticalAlign: 'top' }}>
          {showChordRow && (
            <span
              className="font-semibold select-none"
              style={{ color: chordColor, display: 'block', whiteSpace: 'pre', minHeight: '1em' }}
            >
              {showChordHere ? <span style={chordSpanStyle}>{chord}</span> : '\u00A0'}
            </span>
          )}
          <span>{token}</span>
        </span>
      );
    });
  };

  return (
    <div style={{ fontFamily: MONO_FONT, fontSize }}>
      {pairs.map((p, i) => renderPair(p, i))}
    </div>
  );
}
