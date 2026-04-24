import { getYoutubeEmbedUrl } from '../liveTournamentUtils.ts';

export function YouTubeEmbed({
  url,
  title = 'YouTube stream',
}: {
  url: string;
  title?: string;
}) {
  const embedUrl = getYoutubeEmbedUrl(url);

  if (!embedUrl) {
    return null;
  }

  return (
    <div className="relative w-full overflow-hidden rounded-md border bg-muted/20" style={{ aspectRatio: '16 / 9' }}>
      <iframe
        src={embedUrl}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
