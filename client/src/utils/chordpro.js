export function parseChordPro(text) {
  const lines = text.split("\n");
  const meta = { title: "", artist: "", key: "", capo: "" };
  const sections = [];
  let cur = { type: "verse", label: "", lines: [] };

  for (const raw of lines) {
    const line = raw.trim();

    // Metadata directives
    const mm = line.match(/^\{(title|t|artist|a|key|capo)\s*:\s*(.+?)\}$/i);
    if (mm) {
      const d = mm[1].toLowerCase();
      if (d === "t" || d === "title") meta.title = mm[2];
      else if (d === "a" || d === "artist") meta.artist = mm[2];
      else if (d === "key") meta.key = mm[2];
      else if (d === "capo") meta.capo = mm[2];
      continue;
    }

    // Section start
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

    // Section end
    if (line.match(/^\{(eoc|end_of_chorus|eov|end_of_verse|eob|end_of_bridge)\}$/i)) {
      if (cur.lines.length > 0) sections.push(cur);
      cur = { type: "verse", label: "", lines: [] };
      continue;
    }

    // Skip unknown directives
    if (line.startsWith("{") && line.endsWith("}")) continue;

    // Empty line — section break
    if (line === "") {
      if (cur.lines.length > 0) {
        sections.push(cur);
        cur = { type: cur.type, label: "", lines: [] };
      }
      continue;
    }

    // Parse chord/text pairs
    const pairs = [];
    let rem = line;
    while (rem.length > 0) {
      const ci = rem.indexOf("[");
      if (ci === -1) {
        if (pairs.length === 0) pairs.push({ chord: "", text: rem });
        else pairs[pairs.length - 1].text += rem;
        break;
      }
      if (ci > 0) {
        if (pairs.length === 0) pairs.push({ chord: "", text: rem.substring(0, ci) });
        else pairs[pairs.length - 1].text += rem.substring(0, ci);
        rem = rem.substring(ci);
        continue;
      }
      const ei = rem.indexOf("]");
      if (ei === -1) {
        pairs.push({ chord: "", text: rem });
        break;
      }
      pairs.push({ chord: rem.substring(1, ei), text: "" });
      rem = rem.substring(ei + 1);
    }
    if (pairs.length > 0) cur.lines.push({ pairs });
  }
  if (cur.lines.length > 0) sections.push(cur);
  return { meta, sections };
}

export function songToChordPro(song) {
  let out = "";
  if (song.title) out += `{title: ${song.title}}\n`;
  if (song.artist) out += `{artist: ${song.artist}}\n`;
  if (song.key) out += `{key: ${song.key}}\n`;
  out += "\n" + song.chordpro.split("\n").filter(l => !l.trim().match(/^\{(title|t|artist|a|key)\s*:/i)).join("\n");
  return out.trim();
}
