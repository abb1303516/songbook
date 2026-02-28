const NOTES_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const NOTES_FLAT = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
const CHORD_RE = /^([A-G][#b]?)(.*)/;

export function transposeChord(chord, semitones) {
  if (!semitones) return chord;
  const m = chord.match(CHORD_RE);
  if (!m) return chord;
  const [, root, suffix] = m;
  const useFlats = root.includes("b");
  const notes = useFlats ? NOTES_FLAT : NOTES_SHARP;
  const idx = notes.indexOf(root);
  if (idx === -1) {
    const altIdx = (useFlats ? NOTES_SHARP : NOTES_FLAT).indexOf(root);
    if (altIdx === -1) return chord;
    const newIdx = ((altIdx + semitones) % 12 + 12) % 12;
    return notes[newIdx] + suffix;
  }
  const newIdx = ((idx + semitones) % 12 + 12) % 12;
  return notes[newIdx] + suffix;
}

export function transposeKey(key, semitones) {
  if (!key || !semitones) return key;
  return transposeChord(key, semitones);
}

// Convert B-notation to H-notation for display
// B → H, Bb → B, Bm → Hm, Bb7 → B7, etc.
export function chordToH(chord) {
  if (!chord) return chord;
  if (chord.startsWith('Bb')) return 'B' + chord.slice(2);
  if (chord.startsWith('B')) return 'H' + chord.slice(1);
  return chord;
}
