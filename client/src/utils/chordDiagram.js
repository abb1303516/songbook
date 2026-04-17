import guitar from '@tombatossals/chords-db/lib/guitar.json';

// Extract all unique chords from ChordPro text
export function extractChords(chordpro) {
  if (!chordpro) return [];
  const re = /\[([^\]]+)\]/g;
  const seen = new Set();
  const chords = [];
  let m;
  while ((m = re.exec(chordpro)) !== null) {
    const c = m[1].trim();
    if (c && !seen.has(c)) {
      seen.add(c);
      chords.push(c);
    }
  }
  return chords;
}

// Map notation: H/Hm → B/Bm (German/Russian notation)
function normalizeRoot(root) {
  if (root === 'H') return 'B';
  if (root === 'Hb') return 'Bb';
  return root;
}

// Convert sharp/flat to chords-db key format
// chords-db uses: C, Csharp, D, Eb, E, F, Fsharp, G, Ab, A, Bb, B
const KEY_MAP = {
  'C': 'C', 'C#': 'Csharp', 'Db': 'Csharp',
  'D': 'D', 'D#': 'Eb', 'Eb': 'Eb',
  'E': 'E',
  'F': 'F', 'F#': 'Fsharp', 'Gb': 'Fsharp',
  'G': 'G', 'G#': 'Ab', 'Ab': 'Ab',
  'A': 'A', 'A#': 'Bb', 'Bb': 'Bb',
  'B': 'B',
};

// Map common suffixes to chords-db suffix format
function mapSuffix(s) {
  if (!s) return 'major';
  if (s === 'm') return 'minor';
  if (s === 'M' || s === 'maj') return 'major';
  if (s === 'mmaj7' || s === 'm(maj7)') return 'mmaj7';
  // Direct match
  const known = guitar.suffixes;
  if (known.includes(s)) return s;
  // Try lowercase
  const lower = s.toLowerCase();
  if (known.includes(lower)) return lower;
  // Common aliases
  if (s === 'min') return 'minor';
  if (s === 'maj7') return 'maj7';
  if (s === 'M7') return 'maj7';
  if (s === 'M9') return 'maj9';
  if (s === 'add9') return 'add9';
  return s; // return as is, will likely fail lookup
}

// Parse chord string → { root, suffix, bass }
export function parseChord(chord) {
  // Handle slash chord: Am/G
  const [main, bass] = chord.split('/');
  const m = main.match(/^([A-H][#b]?)(.*)$/);
  if (!m) return null;
  let root = normalizeRoot(m[1]);
  const suffix = m[2];
  return { root, suffix, bass: bass ? normalizeRoot(bass) : null };
}

// Normalize position: if all fretted notes >= 2 (NO open strings) and baseFret = 1,
// shift so lowest fretted becomes 1 and baseFret shows the actual fret.
// If any string is open (fret === 0), keep baseFret=1 with the nut line.
function normalizePosition(pos) {
  if (pos.baseFret !== 1) return pos;
  const hasOpen = pos.frets.some(f => f === 0);
  if (hasOpen) return pos; // open strings need the nut — don't shift
  const fretted = pos.frets.filter(f => f > 0);
  if (fretted.length === 0) return pos;
  const minFret = Math.min(...fretted);
  if (minFret < 2) return pos;
  const shift = minFret - 1;
  return {
    ...pos,
    baseFret: minFret,
    frets: pos.frets.map(f => f > 0 ? f - shift : f),
    barres: (pos.barres || []).map(b => b - shift),
  };
}

// Find chord in chords-db. Returns { key, suffix, positions } or null
export function findChord(chordStr) {
  const parsed = parseChord(chordStr);
  if (!parsed) return null;
  const key = KEY_MAP[parsed.root];
  if (!key) return null;
  const suffix = mapSuffix(parsed.suffix);
  const keyChords = guitar.chords[key];
  if (!keyChords) return null;
  const entry = keyChords.find(c => c.suffix === suffix);
  if (!entry) return null;
  const positions = entry.positions.map(normalizePosition);
  return { key, suffix, positions, displayName: chordStr };
}

// Guitar config for react-chords component
export const GUITAR_INSTRUMENT = {
  strings: 6,
  fretsOnChord: 4,
  name: 'Guitar',
  keys: [],
  tunings: { standard: ['E', 'A', 'D', 'G', 'B', 'E'] },
};
