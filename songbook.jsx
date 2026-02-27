import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ============================================================
// CHORD TRANSPOSITION
// ============================================================
const NOTES_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const NOTES_FLAT = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
const CHORD_RE = /^([A-G][#b]?)(.*)/;

function transposeChord(chord, semitones) {
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

// ============================================================
// CHORDPRO PARSER
// ============================================================
function parseChordPro(text) {
  const lines = text.split("\n");
  const meta = { title: "", artist: "", key: "", capo: "" };
  const sections = [];
  let cur = { type: "verse", label: "", lines: [] };

  for (const raw of lines) {
    const line = raw.trim();
    const mm = line.match(/^\{(title|t|artist|a|key|capo)\s*:\s*(.+?)\}$/i);
    if (mm) {
      const d = mm[1].toLowerCase();
      if (d === "t" || d === "title") meta.title = mm[2];
      else if (d === "a" || d === "artist") meta.artist = mm[2];
      else if (d === "key") meta.key = mm[2];
      else if (d === "capo") meta.capo = mm[2];
      continue;
    }
    const ss = line.match(/^\{(soc|start_of_chorus|sov|start_of_verse|sob|start_of_bridge|comment|c)\s*:?\s*(.*?)\}$/i);
    if (ss) {
      if (cur.lines.length > 0) sections.push(cur);
      const d = ss[1].toLowerCase();
      let type = "verse";
      if (d === "soc" || d === "start_of_chorus") type = "chorus";
      else if (d === "sob" || d === "start_of_bridge") type = "bridge";
      else if (d === "c" || d === "comment") type = "comment";
      cur = { type, label: ss[2] || "", lines: [] };
      if (type === "comment") {
        cur.lines.push({ pairs: [{ chord: "", text: ss[2] }] });
        sections.push(cur);
        cur = { type: "verse", label: "", lines: [] };
      }
      continue;
    }
    if (line.match(/^\{(eoc|end_of_chorus|eov|end_of_verse|eob|end_of_bridge)\}$/i)) {
      if (cur.lines.length > 0) sections.push(cur);
      cur = { type: "verse", label: "", lines: [] };
      continue;
    }
    if (line.startsWith("{") && line.endsWith("}")) continue;
    if (line === "") {
      if (cur.lines.length > 0) { sections.push(cur); cur = { type: cur.type, label: "", lines: [] }; }
      continue;
    }
    const pairs = [];
    let rem = line;
    while (rem.length > 0) {
      const ci = rem.indexOf("[");
      if (ci === -1) { if (pairs.length === 0) pairs.push({ chord: "", text: rem }); else pairs[pairs.length - 1].text += rem; break; }
      if (ci > 0) { if (pairs.length === 0) pairs.push({ chord: "", text: rem.substring(0, ci) }); else pairs[pairs.length - 1].text += rem.substring(0, ci); rem = rem.substring(ci); continue; }
      const ei = rem.indexOf("]");
      if (ei === -1) { pairs.push({ chord: "", text: rem }); break; }
      pairs.push({ chord: rem.substring(1, ei), text: "" });
      rem = rem.substring(ei + 1);
    }
    if (pairs.length > 0) cur.lines.push({ pairs });
  }
  if (cur.lines.length > 0) sections.push(cur);
  return { meta, sections };
}

function songToChordPro(song) {
  let out = "";
  if (song.title) out += `{title: ${song.title}}\n`;
  if (song.artist) out += `{artist: ${song.artist}}\n`;
  if (song.key) out += `{key: ${song.key}}\n`;
  out += "\n" + song.chordpro.split("\n").filter(l => !l.trim().match(/^\{(title|t|artist|a|key)\s*:/i)).join("\n");
  return out.trim();
}

// ============================================================
// QR CODE — simple deterministic SVG grid
// ============================================================
function QRCode({ data, size = 150, fg = "#000", bg = "#fff" }) {
  const matrix = useMemo(() => {
    const n = 25;
    const m = Array(n).fill(null).map(() => Array(n).fill(false));
    const drawFinder = (ox, oy) => {
      for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
        m[oy + i][ox + j] = i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4);
      }
    };
    drawFinder(0, 0); drawFinder(n - 7, 0); drawFinder(0, n - 7);
    let h = 0;
    for (let i = 0; i < data.length; i++) h = ((h << 5) - h + data.charCodeAt(i)) | 0;
    let seed = Math.abs(h);
    const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (m[y][x]) continue;
      if ((x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8)) continue;
      m[y][x] = rng() > 0.55;
    }
    return m;
  }, [data]);
  const n = matrix.length;
  const cs = size / n;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill={bg} rx={6} />
      {matrix.map((row, y) => row.map((cell, x) =>
        cell ? <rect key={`${x}-${y}`} x={x * cs} y={y * cs} width={cs + 0.5} height={cs + 0.5} fill={fg} /> : null
      ))}
    </svg>
  );
}

// ============================================================
// DEMO SONGS
// ============================================================
const DEMO_SONGS = [
  {
    id: "demo1", title: "Звезда по имени Солнце", artist: "Кино", key: "Am",
    tags: ["рок", "для компании"], transpose: 0, fontSize: 15,
    chordpro: `{sov}
[Am]Белый снег, [C]серый лёд
[D]На растрескавшейся [F]земле
[Am]Одеялом лоскутным [C]на ней
[D]Город в дорожной [E]петле
[Am]А над городом [C]плывут облака
[D]Закрывая небесный [F]свет
[Am]А над городом — [C]жёлтый дым
[D]Городу две тысячи [E]лет
{eov}

{soc: Припев}
[Am]Две тысячи лет — [F]война
[Am]Война без особых [E]причин
[Am]Война — дело [F]молодых
[C]Лекарство против [E]морщин
{eoc}

{sov}
[Am]Красная-красная [C]кровь
[D]Через час уже [F]просто земля
[Am]Через два на ней [C]цветы и трава
[D]Через три она [E]снова жива
[Am]И согрета лучами [C]звезды
[D]По имени [F]Солнце
{eov}

{soc: Припев}
[Am]И мы знаем, что [F]так было всегда
[Am]Что судьбою больше [E]любим
[Am]Кто живёт по законам [F]другим
[C]И кто умрёт [E]молодым
{eoc}`
  },
  {
    id: "demo2", title: "Что такое осень", artist: "ДДТ", key: "Dm",
    tags: ["рок", "для компании"], transpose: 0, fontSize: 15,
    chordpro: `{sov}
[Dm]Что такое о[A]сень — это [Gm]небо,
[A]Плачущее небо под но[Dm]гами.
[Dm]В лужах раз[A]летаются [Gm]птицы с обла[A]ками.
[Gm]Осень, я давно с тобою [A]не был.
{eov}

{soc: Припев}
[D]Осень, в [G]небе жгут ко[D]рабли.
[D]Осень, мне [G]бы прочь от [A]земли.
[D]Там, где в [G]море тонет [D]печаль,
[Gm]Осень — тёмная [A]даль.
{eoc}

{sov}
[Dm]Что такое о[A]сень — это [Gm]камни,
[A]Верность над чернеющей Не[Dm]вою.
[Dm]Осень вновь на[A]помнила [Gm]душе о [A]самом главном,
[Gm]Осень, я опять лишён по[A]коя.
{eov}

{soc: Припев}
[D]Осень, в [G]небе жгут ко[D]рабли.
[D]Осень, мне [G]бы прочь от [A]земли.
[D]Там, где в [G]море тонет [D]печаль,
[Gm]Осень — тёмная [A]даль.
{eoc}`
  },
  {
    id: "demo3", title: "Милая моя", artist: "Визбор", key: "Am",
    tags: ["бардовская", "для компании"], transpose: 0, fontSize: 15,
    chordpro: `{soc: Припев}
[Am]Милая моя,
[Dm]Солнышко лес[G]ное,
[C]Где, в каких кра[Am]ях
[Dm]Встретишь[E]ся со [Am]мною?
{eoc}

{sov: Куплет 1}
[Am]Крылья сло[Dm]жив у [G]окна,
[C]Белый пла[Am]ток теребя,
[Dm]Ждёт не дождёт[E]ся вес[Am]на —
[Dm]Ждёт не дождёт[E]ся мен[Am]я.
{eov}

{soc: Припев}
[Am]Милая моя,
[Dm]Солнышко лес[G]ное,
[C]Где, в каких кра[Am]ях
[Dm]Встретишь[E]ся со [Am]мною?
{eoc}

{sov: Куплет 2}
[Am]Облака проплы[Dm]вут, [G]позовут,
[C]Мимо пронесут[Am]ся, промчатся,
[Dm]Но будет вечный [E]приют
[Am]Там, где мы будем [Dm]встреча[E]ться [Am]вновь.
{eov}`
  }
];

// ============================================================
// HELPERS
// ============================================================
function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function genShareCode() { const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }

async function loadData() { try { const r = await window.storage.get("songbook-v3"); return r ? JSON.parse(r.value) : null; } catch { return null; } }
async function saveData(d) { try { await window.storage.set("songbook-v3", JSON.stringify(d)); } catch (e) { console.error(e); } }
async function saveShared(code, d) { try { await window.storage.set(`sh:${code}`, JSON.stringify(d), true); } catch (e) { console.error(e); } }
async function loadShared(code) { try { const r = await window.storage.get(`sh:${code}`, true); return r ? JSON.parse(r.value) : null; } catch { return null; } }

// ============================================================
// THEMES
// ============================================================
const themes = {
  dark: {
    bg: "#111113", surface: "#1a1a1e", surfaceHover: "#222228", card: "#1e1e24",
    border: "#2c2c34", text: "#e4e4e8", textMuted: "#71718a",
    chorusBg: "rgba(255,255,255,0.035)", bridgeBg: "rgba(255,255,255,0.02)",
    chorusBorder: "rgba(255,255,255,0.12)", bridgeBorder: "rgba(255,255,255,0.06)",
    danger: "#e05555", success: "#4caf50",
    accent: "#d48a25", accentText: "#000",
    qrFg: "#ddd", qrBg: "#222",
  },
  light: {
    bg: "#f4f3ee", surface: "#ffffff", surfaceHover: "#eeeee8", card: "#f9f8f4",
    border: "#d8d4ca", text: "#1a1a1a", textMuted: "#888880",
    chorusBg: "rgba(0,0,0,0.03)", bridgeBg: "rgba(0,0,0,0.015)",
    chorusBorder: "rgba(0,0,0,0.1)", bridgeBorder: "rgba(0,0,0,0.05)",
    danger: "#d04040", success: "#3a9a3e",
    accent: "#b87018", accentText: "#fff",
    qrFg: "#222", qrBg: "#fff",
  },
};

const CHORD_COLORS = [
  { name: "Янтарь", dark: "#e8a820", light: "#9a5800" },
  { name: "Красный", dark: "#e85848", light: "#b82818" },
  { name: "Зелёный", dark: "#40b868", light: "#187838" },
  { name: "Синий", dark: "#4898e8", light: "#1858b0" },
  { name: "Фиолет", dark: "#a878e0", light: "#5828a0" },
  { name: "Контраст", dark: "#d0d0d0", light: "#222222" },
];

const FONT_BODY = "'Source Sans 3', 'Segoe UI', system-ui, sans-serif";
const FONT_MONO = "'Source Code Pro', 'Fira Mono', 'Courier New', monospace";

// ============================================================
// ICONS
// ============================================================
const Ic = ({ d, size = 20, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d={d}/></svg>
);
const IC = {
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  plus: "M12 5v14M5 12h14",
  back: "M19 12H5M12 19l-7-7 7-7",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2",
  share: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
  copy: "M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2v-2M16 4h2a2 2 0 012 2v6a2 2 0 01-2 2h-2M8 4a2 2 0 012-2h4a2 2 0 012 2",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  expand: "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7",
  shrink: "M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7",
  sun: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  moon: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  gear: "M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z",
};

// ============================================================
// SONG LINE — chords on their own line above text
// ============================================================
function SongLine({ pairs, transpose, chordColor, chordSize, textSize, showChords, mono }) {
  const chordPositions = [];
  const textParts = [];
  let pos = 0;
  for (const p of pairs) {
    if (p.chord) chordPositions.push({ chord: transposeChord(p.chord, transpose), pos });
    textParts.push(p.text);
    pos += p.text.length;
  }
  const textStr = textParts.join("");
  const hasChords = showChords && chordPositions.length > 0;

  if (!hasChords) {
    return (
      <div style={{ fontSize: textSize, lineHeight: 1.4, whiteSpace: "pre-wrap", fontFamily: mono ? FONT_MONO : FONT_BODY }}>
        {textStr}
      </div>
    );
  }

  // Build chord line with proper spacing using character positions
  let chordLine = "";
  let lastEnd = 0;
  for (const cp of chordPositions) {
    const target = Math.max(cp.pos, lastEnd);
    while (chordLine.length < target) chordLine += "\u00A0";
    chordLine += cp.chord;
    lastEnd = chordLine.length + 1;
  }

  return (
    <div style={{ marginBottom: 1 }}>
      <div style={{
        fontSize: chordSize, fontWeight: 700, color: chordColor,
        fontFamily: FONT_MONO, whiteSpace: "pre", lineHeight: 1.2,
        letterSpacing: "0.02em",
      }}>
        {chordLine}
      </div>
      <div style={{
        fontSize: textSize, lineHeight: 1.3,
        fontFamily: mono ? FONT_MONO : FONT_BODY,
        whiteSpace: "pre-wrap",
      }}>
        {textStr}
      </div>
    </div>
  );
}

// ============================================================
// SONG CONTENT
// ============================================================
function SongContent({ song, transpose, fontSize, chordSize, chordColor, fitToScreen, showChords, mono, containerRef, T }) {
  const parsed = useMemo(() => parseChordPro(song.chordpro), [song.chordpro]);
  const contentRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);

  useEffect(() => {
    if (!fitToScreen || !containerRef?.current || !contentRef.current) { setFitScale(1); return; }
    contentRef.current.style.transform = "scale(1)";
    contentRef.current.style.transformOrigin = "top left";
    requestAnimationFrame(() => {
      if (!containerRef.current || !contentRef.current) return;
      const ch = containerRef.current.clientHeight - 8;
      const cw = containerRef.current.clientWidth - 8;
      const sh = contentRef.current.scrollHeight;
      const sw = contentRef.current.scrollWidth;
      const scale = Math.min(ch / sh, cw / sw, 1);
      setFitScale(Math.max(scale, 0.35));
    });
  }, [fitToScreen, fontSize, chordSize, song.chordpro, transpose, showChords, mono, containerRef]);

  return (
    <div ref={contentRef} style={{
      padding: "10px 14px 24px",
      transform: fitToScreen ? `scale(${fitScale})` : "none",
      transformOrigin: "top left",
      width: fitToScreen ? `${100 / fitScale}%` : "auto",
    }}>
      {parsed.sections.map((sec, si) => {
        const isC = sec.type === "chorus";
        const isB = sec.type === "bridge";
        return (
          <div key={si} style={{
            marginBottom: fontSize * 0.5,
            padding: (isC || isB) ? `${fontSize * 0.3}px ${fontSize * 0.5}px` : 0,
            background: isC ? T.chorusBg : isB ? T.bridgeBg : "transparent",
            borderRadius: (isC || isB) ? 6 : 0,
            borderLeft: isC ? `3px solid ${T.chorusBorder}` : isB ? `3px solid ${T.bridgeBorder}` : "none",
          }}>
            {sec.label && sec.type !== "comment" && (
              <div style={{ fontSize: fontSize * 0.72, color: T.textMuted, marginBottom: 3, fontWeight: 600, fontFamily: FONT_BODY, textTransform: "lowercase", letterSpacing: "0.03em" }}>
                {sec.label}
              </div>
            )}
            {sec.type === "comment" ? (
              <div style={{ fontSize: fontSize * 0.8, color: T.textMuted, fontStyle: "italic", fontFamily: FONT_BODY }}>{sec.lines[0]?.pairs[0]?.text}</div>
            ) : (
              sec.lines.map((line, li) => (
                <SongLine key={li} pairs={line.pairs} transpose={transpose}
                  chordColor={chordColor} chordSize={chordSize} textSize={fontSize}
                  showChords={showChords} mono={mono} />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// SHARE MODAL
// ============================================================
function ShareModal({ songs, currentSong, onClose, T }) {
  const [mode, setMode] = useState("list");
  const [showChords, setShowChords] = useState(false);
  const [shareCode, setShareCode] = useState(null);
  const [copied, setCopied] = useState(false);

  const toShare = mode === "song" && currentSong ? [currentSong] : songs;

  const handleGen = async () => {
    const code = genShareCode();
    await saveShared(code, { songs: toShare, showChords });
    setShareCode(code);
  };

  const handleCopyText = () => {
    const parsed = toShare.map(s => {
      const p = parseChordPro(s.chordpro);
      let t = `${s.title}${s.artist ? " — " + s.artist : ""}\n\n`;
      for (const sec of p.sections) {
        if (sec.label) t += `  ${sec.label}\n`;
        for (const line of sec.lines) {
          let lt = "";
          for (const pair of line.pairs) {
            if (showChords && pair.chord) lt += `[${pair.chord}]`;
            lt += pair.text;
          }
          t += lt + "\n";
        }
        t += "\n";
      }
      return t.trim();
    }).join("\n\n————————\n\n");
    navigator.clipboard.writeText(parsed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={stl.modal(T)} onClick={onClose}>
      <div style={stl.modalBox(T)} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>Поделиться</h3>
          <button style={stl.btn(T)} onClick={onClose}><Ic d={IC.x} /></button>
        </div>

        {currentSong && (
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[["list", `Все (${songs.length})`], ["song", currentSong.title]].map(([k, l]) => (
              <button key={k} onClick={() => { setMode(k); setShareCode(null); }}
                style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: mode === k ? T.accent : T.card, color: mode === k ? T.accentText : T.text,
                  fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {l}
              </button>
            ))}
          </div>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, cursor: "pointer", fontSize: 14 }}>
          <input type="checkbox" checked={showChords} onChange={e => { setShowChords(e.target.checked); setShareCode(null); }}
            style={{ accentColor: T.accent, width: 18, height: 18 }} />
          Показывать аккорды
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button style={stl.btnAccent(T)} onClick={handleCopyText}>
            {copied ? "✓ Скопировано!" : "Копировать текст в мессенджер"}
          </button>

          {!shareCode ? (
            <button style={stl.btnOutline(T)} onClick={handleGen}>
              Сгенерировать QR-код
            </button>
          ) : (
            <div style={{ background: T.card, borderRadius: 10, padding: 16, textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                <QRCode data={shareCode} size={140} fg={T.qrFg} bg={T.qrBg} />
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Код доступа:</div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 5, fontFamily: FONT_MONO, color: T.accent, marginBottom: 8 }}>{shareCode}</div>
              <button style={{ ...stl.btnOutline(T), width: "100%", fontSize: 13 }}
                onClick={() => navigator.clipboard.writeText(shareCode)}>
                Копировать код
              </button>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 8, lineHeight: 1.5 }}>
                Друг вводит код в «ABC» на главном экране
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// IMPORT SHARED
// ============================================================
function ImportSharedModal({ onImport, onClose, T }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const go = async () => {
    setLoading(true); setErr("");
    const d = await loadShared(code.toUpperCase().trim());
    if (d) onImport(d); else setErr("Код не найден.");
    setLoading(false);
  };

  return (
    <div style={stl.modal(T)} onClick={onClose}>
      <div style={stl.modalBox(T)} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>Открыть по коду</h3>
        <p style={{ fontSize: 14, color: T.textMuted, margin: "0 0 12px" }}>Введите код от друга</p>
        <input
          style={{ ...stl.input(T), fontSize: 24, textAlign: "center", letterSpacing: 6, fontFamily: FONT_MONO, fontWeight: 700 }}
          value={code} onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="ABC123" maxLength={6}
        />
        {err && <div style={{ color: T.danger, fontSize: 13, marginTop: 6 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button style={{ ...stl.btnOutline(T), flex: 1 }} onClick={onClose}>Отмена</button>
          <button style={{ ...stl.btnAccent(T), flex: 1, opacity: code.length < 6 ? 0.5 : 1 }}
            onClick={go} disabled={code.length < 6 || loading}>{loading ? "..." : "Открыть"}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS
// ============================================================
function SettingsPanel({ settings, onUpdate, T, onThemeToggle }) {
  const ci = settings.chordColorIdx ?? 0;
  const cso = settings.chordSizeOffset ?? 0;
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Theme */}
      <div>
        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 6, fontWeight: 600 }}>Тема</div>
        <button style={{ ...stl.btnOutline(T), display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }} onClick={onThemeToggle}>
          <Ic d={settings.theme === "dark" ? IC.sun : IC.moon} size={16} />
          {settings.theme === "dark" ? "Светлая тема" : "Тёмная тема"}
        </button>
      </div>

      {/* Chord color */}
      <div>
        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 6, fontWeight: 600 }}>Цвет аккордов</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CHORD_COLORS.map((c, i) => {
            const cv = settings.theme === "dark" ? c.dark : c.light;
            return (
              <button key={i} onClick={() => onUpdate({ chordColorIdx: i })}
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  border: ci === i ? `2.5px solid ${T.text}` : `2px solid ${T.border}`,
                  background: cv, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "transform 0.1s",
                  transform: ci === i ? "scale(1.1)" : "scale(1)",
                }}>
                {ci === i && <Ic d={IC.check} size={16} style={{ color: i >= 4 ? "#fff" : (settings.theme === "dark" ? "#000" : "#fff") }} />}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 8 }}>
          <span style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 18, color: settings.theme === "dark" ? CHORD_COLORS[ci].dark : CHORD_COLORS[ci].light }}>
            Am &nbsp; C &nbsp; Dm7 &nbsp; G
          </span>
          <span style={{ fontSize: 13, color: T.textMuted, marginLeft: 10 }}>— так будет выглядеть</span>
        </div>
      </div>

      {/* Chord size */}
      <div>
        <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 6, fontWeight: 600 }}>
          Размер аккордов относительно текста: {cso > 0 ? "+" : ""}{cso}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[-3, -2, -1, 0, 1, 2, 3].map(v => (
            <button key={v} onClick={() => onUpdate({ chordSizeOffset: v })}
              style={{
                padding: "5px 0", flex: 1, borderRadius: 6, border: "none", cursor: "pointer",
                background: cso === v ? T.accent : T.card, color: cso === v ? T.accentText : T.text,
                fontWeight: 600, fontSize: 13, fontFamily: FONT_BODY,
              }}>
              {v > 0 ? "+" : ""}{v}
            </button>
          ))}
        </div>
      </div>

      {/* Mono */}
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
        <input type="checkbox" checked={settings.mono ?? false} onChange={e => onUpdate({ mono: e.target.checked })}
          style={{ accentColor: T.accent, width: 18, height: 18 }} />
        <div>
          <div>Моноширинный шрифт для текста</div>
          <div style={{ fontSize: 12, color: T.textMuted }}>Точнее выравнивает аккорды над словами</div>
        </div>
      </label>
    </div>
  );
}

// ============================================================
// EDITORS
// ============================================================
function SongEditor({ song, onSave, onCancel, T }) {
  const [title, setTitle] = useState(song?.title || "");
  const [artist, setArtist] = useState(song?.artist || "");
  const [key_, setKey] = useState(song?.key || "");
  const [tagStr, setTagStr] = useState((song?.tags || []).join(", "));
  const [cp, setCp] = useState(song?.chordpro || "");
  const [preview, setPreview] = useState(false);

  const save = () => {
    if (!title.trim()) return;
    onSave({ id: song?.id || genId(), title: title.trim(), artist: artist.trim(), key: key_.trim(),
      tags: tagStr.split(",").map(t => t.trim().toLowerCase()).filter(Boolean),
      chordpro: cp, transpose: song?.transpose || 0, fontSize: song?.fontSize || 15, createdAt: song?.createdAt || Date.now() });
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={stl.header(T)}>
        <button style={stl.btn(T)} onClick={onCancel}><Ic d={IC.back} /></button>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>{song ? "Редактировать" : "Новая песня"}</div>
        <button style={{ ...stl.btnAccent(T), width: "auto" }} onClick={save}>Сохранить</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input style={stl.input(T)} placeholder="Название *" value={title} onChange={e => setTitle(e.target.value)} />
          <input style={stl.input(T)} placeholder="Исполнитель" value={artist} onChange={e => setArtist(e.target.value)} />
          <div style={{ display: "flex", gap: 10 }}>
            <input style={{ ...stl.input(T), flex: 1 }} placeholder="Тональность" value={key_} onChange={e => setKey(e.target.value)} />
            <input style={{ ...stl.input(T), flex: 2 }} placeholder="Теги через запятую" value={tagStr} onChange={e => setTagStr(e.target.value)} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: T.textMuted, fontWeight: 600 }}>ChordPro:</span>
            <button style={{ ...stl.btn(T), fontSize: 12, color: T.accent }} onClick={() => setPreview(!preview)}>
              {preview ? "Редактор" : "Предпросмотр"}
            </button>
          </div>
          {preview ? (
            <div style={{ background: T.card, borderRadius: 8, minHeight: 180, overflow: "auto" }}>
              <SongContent song={{ chordpro: cp }} transpose={0} fontSize={14} chordSize={13}
                chordColor={CHORD_COLORS[0][T === themes.dark ? "dark" : "light"]}
                fitToScreen={false} showChords={true} mono={false} T={T} />
            </div>
          ) : (
            <textarea style={{ ...stl.input(T), fontFamily: FONT_MONO, fontSize: 13, minHeight: 200, resize: "vertical", lineHeight: 1.5 }}
              rows={15} value={cp} onChange={e => setCp(e.target.value)}
              placeholder={`[Am]Текст [C]с аккордами\n\n{soc: Припев}\n[F]Припев [G]тут\n{eoc}`} />
          )}
          <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.6 }}>
            Аккорды в [квадратных скобках]. Секции: {"{sov}/{eov}"} — куплет, {"{soc: Припев}/{eoc}"} — припев.
          </div>
        </div>
      </div>
    </div>
  );
}

function SetListEditor({ setlist, songs, onSave, onCancel, T }) {
  const [name, setName] = useState(setlist?.name || "");
  const [sel, setSel] = useState(new Set(setlist?.songIds || []));
  const toggle = id => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={stl.header(T)}>
        <button style={stl.btn(T)} onClick={onCancel}><Ic d={IC.back} /></button>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>{setlist ? "Редактировать" : "Новый сет-лист"}</div>
        <button style={{ ...stl.btnAccent(T), width: "auto" }} onClick={() => {
          if (name.trim()) onSave({ id: setlist?.id || genId(), name: name.trim(), songIds: [...sel] });
        }}>Сохранить</button>
      </div>
      <div style={{ padding: 14 }}>
        <input style={stl.input(T)} placeholder="Название *" value={name} onChange={e => setName(e.target.value)} />
        <div style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>Выбрано: {sel.size}</div>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {songs.map(s => (
          <div key={s.id} onClick={() => toggle(s.id)}
            style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12,
              cursor: "pointer", background: sel.has(s.id) ? T.surfaceHover : "transparent" }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              border: `2px solid ${sel.has(s.id) ? T.accent : T.border}`,
              background: sel.has(s.id) ? T.accent : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{sel.has(s.id) && <Ic d={IC.check} size={14} style={{ color: T.accentText }} />}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{s.title}</div>
              {s.artist && <div style={{ fontSize: 13, color: T.textMuted }}>{s.artist}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImportModal({ onImport, onClose, T }) {
  const [text, setText] = useState("");
  const fr = useRef(null);
  const handleFile = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setText(ev.target.result); r.readAsText(f); };
  return (
    <div style={stl.modal(T)} onClick={onClose}>
      <div style={stl.modalBox(T)} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 12px", fontSize: 17 }}>Импорт ChordPro</h3>
        <button style={{ ...stl.btnOutline(T), width: "100%", marginBottom: 10 }} onClick={() => fr.current?.click()}>Выбрать файл</button>
        <input ref={fr} type="file" accept=".cho,.chordpro,.txt" onChange={handleFile} style={{ display: "none" }} />
        <textarea style={{ ...stl.input(T), fontFamily: FONT_MONO, fontSize: 13, minHeight: 140, resize: "vertical" }}
          rows={8} value={text} onChange={e => setText(e.target.value)} placeholder="Или вставьте ChordPro текст..." />
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button style={{ ...stl.btnOutline(T), flex: 1 }} onClick={onClose}>Отмена</button>
          <button style={{ ...stl.btnAccent(T), flex: 1, opacity: text.trim() ? 1 : 0.5 }} disabled={!text.trim()}
            onClick={() => { const p = parseChordPro(text); onImport({ id: genId(), title: p.meta.title || "Без названия",
              artist: p.meta.artist || "", key: p.meta.key || "", tags: [], chordpro: text, transpose: 0, fontSize: 15, createdAt: Date.now() }); }}>
            Импорт
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AUTO SCROLL
// ============================================================
function useAutoScroll(ref) {
  const [on, setOn] = useState(false);
  const [speed, setSpeed] = useState(30);
  const raf = useRef(null);
  const last = useRef(0);
  useEffect(() => {
    if (!on || !ref.current) return;
    last.current = performance.now();
    const tick = now => { const dt = (now - last.current) / 1000; last.current = now; if (ref.current) ref.current.scrollTop += speed * dt; raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [on, speed, ref]);
  return { on, setOn, speed, setSpeed };
}

// ============================================================
// SONG VIEW
// ============================================================
function SongView({ song, songs, currentSetList, settings, onBack, onEdit, onUpdateSong, T }) {
  const [tr, setTr] = useState(song.transpose || 0);
  const [fs, setFs] = useState(song.fontSize || 15);
  const [fit, setFit] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showCtrl, setShowCtrl] = useState(true);
  const cRef = useRef(null);
  const scroll = useAutoScroll(cRef);

  const ci = settings.chordColorIdx ?? 0;
  const cso = settings.chordSizeOffset ?? 0;
  const cc = CHORD_COLORS[ci];
  const chordColor = settings.theme === "dark" ? cc.dark : cc.light;
  const chordSize = fs + cso;

  const slSongs = currentSetList?.songIds?.map(id => songs.find(s => s.id === id)).filter(Boolean);
  const [nav, setNav] = useState(null);
  const eSong = nav || song;
  const idx = slSongs?.findIndex(s => s.id === eSong.id) ?? -1;

  useEffect(() => { onUpdateSong?.({ ...eSong, transpose: tr, fontSize: fs }); }, [tr, fs]);

  const go = dir => {
    if (!slSongs) return;
    const ni = idx + dir;
    if (ni >= 0 && ni < slSongs.length) { const ns = slSongs[ni]; setNav(ns); setTr(ns.transpose || 0); setFs(ns.fontSize || 15); }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={stl.header(T)}>
        <button style={stl.btn(T)} onClick={onBack}><Ic d={IC.back} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{eSong.title}</div>
          {eSong.artist && <div style={{ fontSize: 12, color: T.textMuted }}>{eSong.artist}</div>}
        </div>
        <button style={stl.btn(T)} onClick={() => onEdit(eSong)}><Ic d={IC.edit} size={18} /></button>
        <button style={stl.btn(T)} onClick={() => setShowShare(true)}><Ic d={IC.share} size={18} /></button>
        <button style={stl.btn(T)} onClick={() => setShowCtrl(!showCtrl)}>
          <Ic d={IC.gear} size={18} />
        </button>
      </div>

      {showCtrl && (
        <div style={{ padding: "7px 12px", background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 13 }}>
          {/* Transpose */}
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ color: T.textMuted, fontSize: 12 }}>Тон</span>
            <button style={stl.ctrl(T)} onClick={() => setTr(t => t - 1)}>−</button>
            <span style={{ minWidth: 24, textAlign: "center", fontWeight: 700, fontFamily: FONT_MONO, fontSize: 13 }}>{tr > 0 ? "+" : ""}{tr}</span>
            <button style={stl.ctrl(T)} onClick={() => setTr(t => t + 1)}>+</button>
          </div>
          <div style={{ width: 1, height: 18, background: T.border }} />
          {/* Font */}
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <button style={stl.ctrl(T)} onClick={() => setFs(s => Math.max(9, s - 1))}>A−</button>
            <span style={{ minWidth: 20, textAlign: "center", fontFamily: FONT_MONO, fontWeight: 700, fontSize: 13 }}>{fs}</span>
            <button style={stl.ctrl(T)} onClick={() => setFs(s => Math.min(28, s + 1))}>A+</button>
          </div>
          <div style={{ width: 1, height: 18, background: T.border }} />
          {/* Fit */}
          <button style={{ ...stl.ctrl(T), background: fit ? T.accent : T.card, color: fit ? T.accentText : T.text, paddingLeft: 6, paddingRight: 8, display: "flex", gap: 3 }}
            onClick={() => setFit(f => !f)}>
            <Ic d={fit ? IC.shrink : IC.expand} size={14} /> {fit ? "Авто" : "В экран"}
          </button>
          <div style={{ width: 1, height: 18, background: T.border }} />
          {/* Scroll */}
          <button style={{ ...stl.ctrl(T), background: scroll.on ? T.success : T.card, color: scroll.on ? "#fff" : T.text }}
            onClick={() => scroll.setOn(!scroll.on)}>{scroll.on ? "⏸" : "▶"}</button>
          {scroll.on && <input type="range" min={5} max={80} value={scroll.speed} onChange={e => scroll.setSpeed(+e.target.value)} style={{ width: 55, accentColor: T.accent }} />}
        </div>
      )}

      <div ref={cRef} style={{ flex: 1, overflow: "auto" }}>
        <SongContent song={eSong} transpose={tr} fontSize={fs} chordSize={chordSize}
          chordColor={chordColor} fitToScreen={fit} showChords={true}
          mono={settings.mono ?? false} containerRef={cRef} T={T} />
      </div>

      {slSongs && slSongs.length > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: T.surface, borderTop: `1px solid ${T.border}` }}>
          <button style={{ ...stl.btnOutline(T), opacity: idx <= 0 ? 0.3 : 1, padding: "5px 12px", fontSize: 13 }}
            disabled={idx <= 0} onClick={() => go(-1)}>← Пред.</button>
          <span style={{ fontSize: 12, color: T.textMuted }}>{idx + 1} / {slSongs.length}</span>
          <button style={{ ...stl.btnOutline(T), opacity: idx >= slSongs.length - 1 ? 0.3 : 1, padding: "5px 12px", fontSize: 13 }}
            disabled={idx >= slSongs.length - 1} onClick={() => go(1)}>След. →</button>
        </div>
      )}

      {showShare && <ShareModal songs={songs} currentSong={eSong} T={T} onClose={() => setShowShare(false)} />}
    </div>
  );
}

// ============================================================
// STYLES FACTORY
// ============================================================
const stl = {
  header: T => ({ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${T.border}`, background: T.surface, position: "sticky", top: 0, zIndex: 100 }),
  btn: T => ({ background: "none", border: "none", color: T.text, cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }),
  btnAccent: T => ({ background: T.accent, color: T.accentText, border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 14, fontFamily: FONT_BODY, width: "100%", boxSizing: "border-box", textAlign: "center" }),
  btnOutline: T => ({ background: "transparent", color: T.accent, border: `1.5px solid ${T.accent}`, cursor: "pointer", padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 14, fontFamily: FONT_BODY, textAlign: "center" }),
  ctrl: T => ({ background: T.card, color: T.text, border: "none", cursor: "pointer", padding: "3px 8px", borderRadius: 6, fontSize: 14, fontWeight: 700, fontFamily: FONT_BODY, display: "flex", alignItems: "center" }),
  input: T => ({ background: T.bg, border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "8px 12px", fontSize: 14, fontFamily: FONT_BODY, width: "100%", boxSizing: "border-box" }),
  modal: T => ({ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }),
  modalBox: T => ({ background: T.surface, borderRadius: 12, padding: 18, maxWidth: 420, width: "100%", maxHeight: "85vh", overflow: "auto", color: T.text }),
  tag: T => ({ display: "inline-block", background: T.surfaceHover, color: T.textMuted, borderRadius: 12, padding: "2px 10px", fontSize: 12, marginRight: 4, cursor: "pointer" }),
  tagOn: T => ({ background: T.accent, color: T.accentText }),
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState("list");
  const [activeSong, setActiveSong] = useState(null);
  const [activeSetList, setActiveSetList] = useState(null);
  const [editSetList, setEditSetList] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showSharedImport, setShowSharedImport] = useState(false);
  const [tab, setTab] = useState("songs");

  useEffect(() => {
    (async () => {
      let d = await loadData();
      if (!d) { d = { songs: DEMO_SONGS, setlists: [], settings: { theme: "dark", chordColorIdx: 0, chordSizeOffset: 0, mono: false } }; await saveData(d); }
      if (!d.settings) d.settings = { theme: "dark", chordColorIdx: 0, chordSizeOffset: 0, mono: false };
      setData(d); setLoading(false);
    })();
  }, []);

  const persist = useCallback(async nd => { setData(nd); await saveData(nd); }, []);
  const settings = data?.settings || { theme: "dark", chordColorIdx: 0, chordSizeOffset: 0, mono: false };
  const T = themes[settings.theme] || themes.dark;
  const songs = data?.songs || [];
  const setlists = data?.setlists || [];
  const allTags = useMemo(() => { const t = new Set(); songs.forEach(s => s.tags?.forEach(x => t.add(x))); return [...t].sort(); }, [songs]);
  const filtered = useMemo(() => {
    let l = songs;
    if (activeTag) l = l.filter(s => s.tags?.includes(activeTag));
    if (search.trim()) { const q = search.toLowerCase(); l = l.filter(s => s.title.toLowerCase().includes(q) || s.artist?.toLowerCase().includes(q)); }
    return l;
  }, [songs, search, activeTag]);

  const saveSong = async s => { const i = songs.findIndex(x => x.id === s.id); await persist({ ...data, songs: i >= 0 ? songs.map(x => x.id === s.id ? s : x) : [...songs, s] }); setScreen("list"); };
  const delSong = async id => { if (!confirm("Удалить?")) return; await persist({ ...data, songs: songs.filter(s => s.id !== id) }); setScreen("list"); };
  const updSong = async s => { await persist({ ...data, songs: songs.map(x => x.id === s.id ? s : x) }); };
  const saveSL = async sl => { const i = setlists.findIndex(x => x.id === sl.id); await persist({ ...data, setlists: i >= 0 ? setlists.map(x => x.id === sl.id ? sl : x) : [...setlists, sl] }); setScreen("list"); setTab("setlists"); };
  const delSL = async id => { if (!confirm("Удалить?")) return; await persist({ ...data, setlists: setlists.filter(s => s.id !== id) }); };
  const updSettings = async u => { await persist({ ...data, settings: { ...settings, ...u } }); };
  const toggleTheme = () => updSettings({ theme: settings.theme === "dark" ? "light" : "dark" });

  const handleExport = () => {
    const t = songs.map(s => songToChordPro(s)).join("\n\n---\n\n");
    const b = new Blob([t], { type: "text/plain" }); const u = URL.createObjectURL(b);
    const a = document.createElement("a"); a.href = u; a.download = "songbook.chordpro"; a.click(); URL.revokeObjectURL(u);
  };
  const handleImport = async s => { await persist({ ...data, songs: [...songs, s] }); setShowImport(false); };
  const handleShared = async sd => {
    if (sd.songs) { const ns = sd.songs.map(s => ({ ...s, id: genId(), createdAt: Date.now() })); await persist({ ...data, songs: [...songs, ...ns] }); }
    setShowSharedImport(false);
  };

  if (loading) return <div style={{ fontFamily: FONT_BODY, background: "#111", color: "#888", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Загрузка...</div>;

  const appS = { fontFamily: FONT_BODY, background: T.bg, color: T.text, minHeight: "100vh", maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column" };

  if (screen === "edit") return <div style={appS}><SongEditor song={activeSong} onSave={saveSong} onCancel={() => setScreen(activeSong ? "view" : "list")} T={T} /></div>;
  if (screen === "setlistEdit") return <div style={appS}><SetListEditor setlist={editSetList} songs={songs} onSave={saveSL} onCancel={() => { setScreen("list"); setTab("setlists"); }} T={T} /></div>;
  if (screen === "settings") return (
    <div style={appS}>
      <div style={stl.header(T)}>
        <button style={stl.btn(T)} onClick={() => setScreen("list")}><Ic d={IC.back} /></button>
        <div style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Настройки</div>
      </div>
      <SettingsPanel settings={settings} onUpdate={updSettings} T={T} onThemeToggle={toggleTheme} />
    </div>
  );
  if (screen === "view" && activeSong) return (
    <div style={appS}>
      <SongView song={activeSong} songs={songs} currentSetList={activeSetList} settings={settings}
        onBack={() => { setScreen("list"); setActiveSetList(null); }}
        onEdit={s => { setActiveSong(s); setScreen("edit"); }}
        onUpdateSong={updSong} T={T} />
    </div>
  );

  return (
    <div style={appS}>
      <div style={stl.header(T)}>
        <div style={{ fontSize: 20, marginRight: 2 }}>🎸</div>
        <div style={{ flex: 1, fontSize: 17, fontWeight: 700 }}>Песенник</div>
        <button style={stl.btn(T)} onClick={() => setShowSharedImport(true)} title="Код">
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: FONT_MONO, border: `1px solid ${T.border}`, borderRadius: 4, padding: "2px 5px" }}>ABC</span>
        </button>
        <button style={stl.btn(T)} onClick={() => setShowImport(true)} title="Импорт"><Ic d={IC.upload} size={18} /></button>
        <button style={stl.btn(T)} onClick={handleExport} title="Экспорт"><Ic d={IC.download} size={18} /></button>
        <button style={stl.btn(T)} onClick={toggleTheme} title="Тема"><Ic d={settings.theme === "dark" ? IC.sun : IC.moon} size={18} /></button>
        <button style={stl.btn(T)} onClick={() => setScreen("settings")} title="Настройки"><Ic d={IC.gear} size={18} /></button>
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}` }}>
        {[["songs", "Песни", songs.length], ["setlists", "Сет-листы", setlists.length]].map(([k, l, c]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ flex: 1, padding: "9px 0", background: "none", border: "none",
              borderBottom: tab === k ? `2px solid ${T.accent}` : "2px solid transparent",
              color: tab === k ? T.text : T.textMuted, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY }}>
            {l} ({c})
          </button>
        ))}
      </div>

      {tab === "songs" && (
        <>
          <div style={{ padding: "10px 12px 6px", display: "flex", gap: 8 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Ic d={IC.search} size={16} style={{ position: "absolute", left: 10, top: 10, color: T.textMuted }} />
              <input style={{ ...stl.input(T), paddingLeft: 32 }} placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button style={{ ...stl.btnAccent(T), width: "auto", padding: "8px 12px" }}
              onClick={() => { setActiveSong(null); setScreen("edit"); }}><Ic d={IC.plus} size={16} /></button>
          </div>
          {allTags.length > 0 && (
            <div style={{ padding: "4px 12px 8px", display: "flex", flexWrap: "wrap", gap: 4 }}>
              <span style={{ ...stl.tag(T), ...(activeTag === null ? stl.tagOn(T) : {}) }} onClick={() => setActiveTag(null)}>все</span>
              {allTags.map(t => <span key={t} style={{ ...stl.tag(T), ...(activeTag === t ? stl.tagOn(T) : {}) }}
                onClick={() => setActiveTag(activeTag === t ? null : t)}>{t}</span>)}
            </div>
          )}
          <div style={{ flex: 1, overflow: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: T.textMuted }}>{songs.length === 0 ? "Добавьте первую песню!" : "Ничего не найдено"}</div>
            ) : filtered.map(s => (
              <div key={s.id} style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}
                onClick={() => { setActiveSong(s); setScreen("view"); setActiveSetList(null); }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{s.title}</div>
                    <div style={{ fontSize: 13, color: T.textMuted, marginTop: 1 }}>
                      {s.artist}{s.key ? ` · ${s.key}` : ""}{s.transpose ? ` (${s.transpose > 0 ? "+" : ""}${s.transpose})` : ""}
                    </div>
                  </div>
                  <button style={stl.btn(T)} onClick={e => { e.stopPropagation(); delSong(s.id); }}><Ic d={IC.trash} size={16} style={{ color: T.textMuted }} /></button>
                </div>
                {s.tags?.length > 0 && <div style={{ marginTop: 3 }}>{s.tags.map(t => <span key={t} style={stl.tag(T)}>{t}</span>)}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "setlists" && (
        <>
          <div style={{ padding: "10px 12px", display: "flex", justifyContent: "flex-end" }}>
            <button style={{ ...stl.btnAccent(T), width: "auto", display: "flex", alignItems: "center", gap: 4 }}
              onClick={() => { setEditSetList(null); setScreen("setlistEdit"); }}><Ic d={IC.plus} size={16} /> Новый сет-лист</button>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {setlists.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: T.textMuted }}>Создайте первый сет-лист!</div>
            ) : setlists.map(sl => {
              const ss = sl.songIds?.map(id => songs.find(s => s.id === id)).filter(Boolean) || [];
              return (
                <div key={sl.id} style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { if (ss.length) { setActiveSetList(sl); setActiveSong(ss[0]); setScreen("view"); } }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{sl.name}</div>
                      <div style={{ fontSize: 13, color: T.textMuted }}>{ss.length} {ss.length === 1 ? "песня" : ss.length < 5 ? "песни" : "песен"}</div>
                    </div>
                    <div style={{ display: "flex", gap: 2 }}>
                      <button style={stl.btn(T)} onClick={() => { setEditSetList(sl); setScreen("setlistEdit"); }}><Ic d={IC.edit} size={16} style={{ color: T.textMuted }} /></button>
                      <button style={stl.btn(T)} onClick={() => delSL(sl.id)}><Ic d={IC.trash} size={16} style={{ color: T.textMuted }} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showImport && <ImportModal onImport={handleImport} onClose={() => setShowImport(false)} T={T} />}
      {showSharedImport && <ImportSharedModal onImport={handleShared} onClose={() => setShowSharedImport(false)} T={T} />}
    </div>
  );
}
