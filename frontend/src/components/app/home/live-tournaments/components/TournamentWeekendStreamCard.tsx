import { ExternalLink } from 'lucide-react';
import type { TournamentWeekendResource } from '../liveTournamentTypes.ts';
import { YouTubeEmbed } from './YouTubeEmbed.tsx';

export function TournamentWeekendStreamCard({
  resource,
  tournamentName,
}: {
  resource: TournamentWeekendResource;
  tournamentName?: string;
}) {
  const title = resource.title || tournamentName || 'Tournament stream';

  return (
    <div className="rounded-md border bg-background p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{title}</div>
          <div className="truncate text-xs text-muted-foreground">
            {tournamentName ?? 'Tournament stream'}
          </div>
        </div>
        <a
          href={resource.resourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs underline"
        >
          YouTube
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <YouTubeEmbed url={resource.resourceUrl} title={title} />
    </div>
  );
}
