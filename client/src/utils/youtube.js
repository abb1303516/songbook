// Extract YouTube video ID from various URL formats
export function parseYoutubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Raw video ID
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export function youtubeEmbedUrl(url) {
  const id = parseYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
