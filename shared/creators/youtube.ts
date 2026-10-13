export function youtubeVideoId(value: string) {
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    let id: string | null = null;
    if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
      id =
        url.pathname === '/watch'
          ? url.searchParams.get('v')
          : (/^\/(?:shorts|live|embed)\/([\w-]{11})\/?$/.exec(url.pathname)?.[1] ?? null);
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Description timestamps are creator-authored chapter suggestions, not inferred speech. */
export function youtubeChapters(description: string) {
  const chapters: { title: string; startSeconds: number }[] = [];
  for (const line of description.split('\n')) {
    const match = /^\s*(?:(\d{1,3}):)?(\d{1,2}):(\d{2})\s+(?:[-–—]\s*)?(.+?)\s*$/.exec(line);
    if (!match) continue;
    const hours = Number(match[1] ?? 0),
      minutes = Number(match[2]),
      seconds = Number(match[3]);
    const startSeconds = hours * 3600 + minutes * 60 + seconds;
    if (seconds >= 60 || (match[1] && minutes >= 60) || startSeconds > 604800) continue;
    if (chapters.length && startSeconds <= chapters[chapters.length - 1].startSeconds) continue;
    chapters.push({ title: match[4].slice(0, 120), startSeconds });
    if (chapters.length === 100) break;
  }
  return chapters;
}
/** Stable public channel identities; handles must be resolved before a directory import. */
export function directoryChannelIds(links: { url: string }[]) {
  return links.flatMap(({ url }) => {
    try {
      const u = new URL(url);
      if (
        u.protocol !== 'https:' ||
        u.username ||
        u.password ||
        u.port ||
        !['youtube.com', 'www.youtube.com'].includes(u.hostname)
      )
        return [];
      const match =
        /^\/channel\/(UC[\w-]{22})(?:\/(?:videos|streams|shorts|featured|about))?\/?$/.exec(
          u.pathname,
        );
      return match ? [match[1]] : [];
    } catch {
      return [];
    }
  });
}
