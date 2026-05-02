import { ExternalLink } from 'lucide-react';
import Flag from '@/components/app/global/Flag.tsx';
import { formatDataById } from '../../../../../../../types/Format.ts';
import type { CountryCode } from '../../../../../../../server/db/lists.ts';
import type {
  LiveTournamentWeekendTournamentEntry,
  TournamentWeekendResource,
} from '../liveTournamentTypes.ts';
import { getPlayerCount } from '../liveTournamentUtils.ts';
import { YouTubeEmbed } from './YouTubeEmbed.tsx';

function TournamentStreamInfoRow({
  tournament,
}: {
  tournament: LiveTournamentWeekendTournamentEntry;
}) {
  const countryCode = tournament.tournament.location as CountryCode | undefined;
  const formatLabel = formatDataById[tournament.tournament.format]?.name ?? 'Unknown format';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        {countryCode && <Flag countryCode={countryCode} className="h-3 w-5 rounded-sm" />}
        <span>{tournament.tournament.location || 'Country unknown'}</span>
        <span>-</span>
        <span>{getPlayerCount(tournament)}</span>
      </span>
      <span>{formatLabel}</span>
    </div>
  );
}

export function TournamentWeekendStreamCard({
  resource,
  tournament,
}: {
  resource: TournamentWeekendResource;
  tournament?: LiveTournamentWeekendTournamentEntry;
}) {
  const title = tournament?.tournament.name || resource.title || 'Tournament stream';
  const embedTitle = resource.title || `${title} stream`;

  return (
    <div className="rounded-md border bg-background p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium leading-tight">{title}</div>
          {tournament && <TournamentStreamInfoRow tournament={tournament} />}
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
      <YouTubeEmbed url={resource.resourceUrl} title={embedTitle} />
    </div>
  );
}
