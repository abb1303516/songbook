#!/usr/bin/env node
// Deterministic chord-over-text → ChordPro parser.
// Usage:
//   node scripts/import-parser.mjs --input FILE [--source amdm|akkords|ug|generic|auto]
//   node scripts/import-parser.mjs --url URL   [--source ...]
//   cat song.txt | node scripts/import-parser.mjs [--source ...]
// Emits JSON to stdout: { title?, artist?, key?, capo?, chordpro, warnings[] }

import fs from 'fs';
import { execSync } from 'child_process';

// ======================= CORE PARSER =======================

const CHORD_RE = /^[A-H][b#]?(?:maj|min|m|dim|aug|sus|add|M)?\d*(?:sus\d+)?(?:add\d+)?(?:maj\d+)?(?:\/[A-H][b#]?m?)?$/;

function isChordToken(tok) {
  return !!tok && CHORD_RE.test(tok);
}

// Cyrillic lookalikes → Latin. Used to recover typos like "Сhоrus:" where
// accidental Cyrillic С and о visually match Latin C and o.
const CYR_TO_LAT = {
  'А':'A','а':'a','В':'B','Е':'E','е':'e','К':'K','М':'M','Н':'H',
  'О':'O','о':'o','Р':'P','р':'p','С':'C','с':'c','Т':'T','х':'x','Х':'X',
  'У':'Y','у':'y','І':'I','і':'i',
};
function latinize(s) {
  let out = '';
  for (const ch of s) out += CYR_TO_LAT[ch] ?? ch;
  return out;
}
function hasMixedScripts(s) {
  return /[А-Яа-яЁё]/.test(s) && /[A-Za-z]/.test(s);
}

function classifyLine(line) {
  const trimmed = line.trim();
  if (trimmed === '') return { type: 'empty' };

  const bracketSection = trimmed.match(/^\[([^\]]+)\]$/);
  if (bracketSection) return { type: 'section', name: bracketSection[1] };

  const ruSection = trimmed.match(/^(Припев|Куплет|Бридж|Проигрыш|Вступление|Инструментал|Кода|Концовка|Соло)\s*\d*\s*:?\s*$/i);
  if (ruSection) return { type: 'section', name: ruSection[1] };

  const enSection = trimmed.match(/^(Chorus|Verse|Bridge|Intro|Outro|Solo|Lead|Interlude|Instrumental|Pre-?Chorus|Refrain)\s*\d*\s*:\s*$/i);
  if (enSection) return { type: 'section', name: enSection[1] };

  // Mixed-script typo recovery: "Сhоrus:" (Cyrillic С, о) → "Chorus:"
  if (/:\s*$/.test(trimmed) && hasMixedScripts(trimmed)) {
    const norm = latinize(trimmed);
    const m = norm.match(/^(Chorus|Verse|Bridge|Intro|Outro|Solo|Lead|Interlude|Instrumental|Pre-?Chorus|Refrain)\s*\d*\s*:\s*$/i);
    if (m) return { type: 'section', name: m[1] };
  }

  if (trimmed.includes('|')) {
    const toks = trimmed.replace(/\|/g, ' ').split(/\s+/).filter(Boolean);
    if (toks.length > 0 && toks.every(isChordToken)) return { type: 'progression' };
  }

  const nonSpace = trimmed.replace(/\s/g, '');
  if (nonSpace.length >= 8) {
    const symbolCount = (nonSpace.match(/[-\d|\/hpxv^~*]/g) || []).length;
    if (symbolCount / nonSpace.length >= 0.55 && nonSpace.includes('-')) {
      return { type: 'tab' };
    }
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every(isChordToken)) return { type: 'chords' };

  return { type: 'lyric' };
}

function mergeChordOverLyric(chordLine, lyricLine) {
  const chords = [];
  let i = 0;
  while (i < chordLine.length) {
    if (chordLine[i] !== ' ') {
      const start = i;
      while (i < chordLine.length && chordLine[i] !== ' ') i++;
      chords.push({ col: start, chord: chordLine.slice(start, i) });
    } else i++;
  }
  let result = '';
  let pos = 0;
  for (const { col, chord } of chords) {
    while (pos < col && pos < lyricLine.length) result += lyricLine[pos++];
    while (pos < col) { result += ' '; pos++; }
    result += `[${chord}]`;
  }
  result += lyricLine.slice(pos);
  return result;
}

function formatChordsOnly(line) {
  return line.trim().split(/\s+/).filter(Boolean).map(c => `[${c}]`).join(' ');
}

function formatProgression(line) {
  return line.replace(/([A-H][b#]?(?:maj|min|m|dim|aug|sus|add|M)?\d*(?:sus\d+)?(?:add\d+)?(?:maj\d+)?(?:\/[A-H][b#]?m?)?)/g, (m) => isChordToken(m) ? `[${m}]` : m);
}

const SECTION_MAP = {
  verse: { open: '{sov}', close: '{eov}' },
  куплет: { open: '{sov}', close: '{eov}' },
  chorus: { open: '{soc}', close: '{eoc}' },
  припев: { open: '{soc}', close: '{eoc}' },
  bridge: { open: '{sob}', close: '{eob}' },
  бридж: { open: '{sob}', close: '{eob}' },
};

function parseChordOverText(text) {
  const lines = text.split('\n');
  const cls = lines.map(classifyLine);
  const out = [];
  let currentClose = null;
  const closeSection = () => { if (currentClose) { out.push(currentClose); currentClose = null; } };

  for (let i = 0; i < cls.length; i++) {
    const c = cls[i];
    if (c.type === 'empty') { out.push(''); continue; }
    if (c.type === 'section') {
      closeSection();
      const key = c.name.toLowerCase().replace(/\s*\d+$/, '').trim();
      const mapped = SECTION_MAP[key];
      if (mapped) { out.push(mapped.open); currentClose = mapped.close; }
      else out.push(`{c: ${c.name}}`);
      continue;
    }
    if (c.type === 'tab') { out.push(lines[i]); continue; }
    if (c.type === 'progression') { out.push(formatProgression(lines[i])); continue; }
    if (c.type === 'chords') {
      const next = cls[i + 1];
      if (next && next.type === 'lyric') {
        out.push(mergeChordOverLyric(lines[i], lines[i + 1]));
        i++;
      } else out.push(formatChordsOnly(lines[i]));
      continue;
    }
    if (c.type === 'lyric') { out.push(lines[i]); continue; }
  }
  closeSection();

  const final = [];
  let prevEmpty = false;
  for (const l of out) {
    if (l === '') { if (!prevEmpty) final.push(''); prevEmpty = true; }
    else { final.push(l); prevEmpty = false; }
  }
  return final.join('\n').trim();
}

// ======================= PREPROCESSORS =======================

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function preprocessUGPaste(text) {
  const metadata = {};
  const warnings = [];
  const lines = text.split('\n');

  for (const line of lines.slice(0, 12)) {
    const m = line.match(/^(.+?)\s+(?:Chords\s+)?by\s+(.+)$/);
    if (m) { metadata.title = m[1].replace(/\s+Chords$/i, '').trim(); metadata.artist = m[2].trim(); break; }
  }
  const capoLine = lines.find(l => /^Capo:/i.test(l));
  if (capoLine) { const m = capoLine.match(/Capo:\s*(\d+)/i); if (m) metadata.capo = parseInt(m[1], 10); }
  const keyLine = lines.find(l => /^Key:/i.test(l));
  if (keyLine) { const m = keyLine.match(/Key:\s*(\S+)/); if (m) metadata.key = m[1]; }

  const firstSection = lines.findIndex(l => /^\s*\[[^\]]+\]\s*$/.test(l));
  if (firstSection < 0) warnings.push('UG paste: no [Section] marker found — structure may be incomplete');
  const body = firstSection >= 0 ? lines.slice(firstSection) : lines;

  const cleaned = body.filter(line => {
    const t = line.trim();
    if (/^Page \d+\/\d+$/i.test(t)) return false;
    if (/^[\s\|X]+$/.test(t) && (t.match(/\|/g) || []).length >= 3) return false;
    return true;
  });

  return { text: cleaned.join('\n'), metadata, warnings };
}

function preprocessAmdmHtml(html) {
  const warnings = [];
  const m = html.match(/<pre[^>]*itemprop="chordsBlock"[^>]*>([\s\S]*?)<\/pre>/);
  if (!m) return { text: '', metadata: {}, warnings: ['amdm: chordsBlock <pre> not found'] };
  let block = m[1];
  block = block.replace(/<div[^>]*class="podbor__chord"[^>]*data-chord="([^"]+)"[^>]*>[\s\S]*?<\/div>/g, '$1');
  block = block.replace(/<[^>]+>/g, '');
  block = decodeEntities(block);

  const metadata = {};
  const titleM = html.match(/<title>([^<]+)<\/title>/);
  if (titleM) {
    const t = titleM[1];
    const mm = t.match(/^(.+?)\s+-\s+(.+?)(?:,\s*аккорд|$)/i);
    if (mm) { metadata.artist = mm[1].trim(); metadata.title = mm[2].trim(); }
  }
  return { text: block, metadata, warnings };
}

function preprocessAkkordsHtml(html) {
  const warnings = [];
  const m = html.match(/<p[^>]*class="chords"[^>]*>([\s\S]*?)<\/p>/);
  if (!m) return { text: '', metadata: {}, warnings: ['akkords: <p class="chords"> not found'] };
  let block = m[1];
  block = block.replace(/<span[^>]*>([\s\S]*?)<\/span>/g, '$1');
  block = block.replace(/<b[^>]*>([\s\S]*?)<\/b>/g, '$1');
  block = block.replace(/<[^>]+>/g, '');
  block = decodeEntities(block);

  const metadata = {};
  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
  const h2 = html.match(/<h2[^>]*>([^<]+?)(?::\s*аккорд[^<]*)?<\/h2>/i);
  if (ogTitle) {
    const t = ogTitle[1];
    const mm = t.match(/^(.+?)\s+[-–—]\s+(.+?)$/);
    if (mm) { metadata.artist = mm[1].trim(); metadata.title = mm[2].trim(); }
    else metadata.title = t.trim();
  } else if (h2) {
    metadata.title = h2[1].trim();
  }
  return { text: block, metadata, warnings };
}

// ======================= SOURCE DETECTION =======================

function detectSource(input, hint) {
  if (hint && hint !== 'auto') return hint;
  if (/^https?:\/\//.test(input)) {
    if (/amdm\.ru/.test(input)) return 'amdm';
    if (/akkords\.pro/.test(input)) return 'akkords';
    if (/ultimate-guitar/.test(input)) return 'ug-url';
    return 'unknown-url';
  }
  if (/<div[^>]*class="podbor__chord"/.test(input)) return 'amdm';
  if (/<p[^>]*class="chords"/.test(input)) return 'akkords';
  if (/\[(Verse|Chorus|Bridge|Intro|Outro)\s*\d*\]/i.test(input) || /Chords by/i.test(input)) return 'ug';
  return 'generic';
}

// ======================= CLI =======================

function parseArgs(argv) {
  const args = { inputFile: null, url: null, source: 'auto' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') args.inputFile = argv[++i];
    else if (a === '--url') args.url = argv[++i];
    else if (a === '--source') args.source = argv[++i];
    else if (a === '-h' || a === '--help') {
      console.log('Usage: node scripts/import-parser.mjs [--input FILE | --url URL] [--source auto|amdm|akkords|ug|generic]');
      process.exit(0);
    }
  }
  return args;
}

function fetchUrl(url) {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
  return execSync(`curl -sL -A "${ua}" "${url}"`, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let raw = '';
  let sourceInput = '';

  if (args.url) {
    sourceInput = args.url;
    raw = fetchUrl(args.url);
  } else if (args.inputFile) {
    raw = fs.readFileSync(args.inputFile, 'utf8');
    sourceInput = raw;
  } else {
    raw = fs.readFileSync(0, 'utf8');
    sourceInput = raw;
  }

  const source = detectSource(sourceInput, args.source);

  let pre;
  if (source === 'amdm') pre = preprocessAmdmHtml(raw);
  else if (source === 'akkords') pre = preprocessAkkordsHtml(raw);
  else if (source === 'ug') pre = preprocessUGPaste(raw);
  else if (source === 'ug-url') pre = { text: '', metadata: {}, warnings: ['UG URL fetch not supported (Cloudflare). Paste the page text instead.'] };
  else if (source === 'unknown-url') pre = { text: raw, metadata: {}, warnings: ['Unknown URL source; treating as generic text'] };
  else pre = { text: raw, metadata: {}, warnings: [] };

  const { text, metadata, warnings } = pre;

  if (!text || !text.trim()) {
    process.stdout.write(JSON.stringify({ source, warnings: [...warnings, 'empty body after preprocessing'], chordpro: '' }, null, 2));
    process.exit(2);
  }

  const chordpro = parseChordOverText(text);

  const result = {
    source,
    ...metadata,
    chordpro,
    warnings,
  };
  process.stdout.write(JSON.stringify(result, null, 2));
}

main();
