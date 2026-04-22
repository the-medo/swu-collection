import { ExternalLink, Trophy } from 'lucide-react';
import Flag from '@/components/app/global/Flag.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { cn } from '@/lib/utils.ts';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';
import {
  formatDateTime,
  getBracketRounds,
  getMeleeUrl,
  getPlayerCount,
  getRoundLabel,
  getUndefeatedPlayers,
} from '../liveTournamentUtils.ts';
import { formatDataById } from '../../../../../../../types/Format.ts';
import type { CountryCode } from '../../../../../../../server/db/lists.ts';
import { BracketPreview } from './BracketPreview.tsx';
import { LiveStatusBadge } from './LiveStatusBadge.tsx';
import { TournamentCardActionsMenu } from './TournamentCardActionsMenu.tsx';
import { WinnerDeckDecoration } from './WinnerDeckDecoration.tsx';

function getMatchesRemainingLabel(entry: LiveTournamentWeekendTournamentEntry) {
  const remaining = entry.weekendTournament.matchesRemaining;
  const total = entry.weekendTournament.matchesTotal;

  if (remaining === null || remaining === undefined) return null;

  const matchWord = remaining === 1 ? 'match' : 'matches';
  if (total === null || total === undefined) return `${remaining} ${matchWord} remaining`;

  return `${remaining}/${total} ${matchWord} remaining`;
}

function getRunningProgressLabel(entry: LiveTournamentWeekendTournamentEntry) {
  const roundLabel = getRoundLabel(entry);
  const matchesRemainingLabel = getMatchesRemainingLabel(entry);

  if (roundLabel && matchesRemainingLabel) return `${roundLabel} - ${matchesRemainingLabel}`;
  return roundLabel ?? matchesRemainingLabel;
}

function getChampionName(entry: LiveTournamentWeekendTournamentEntry) {
  const meleePlayerUsername = entry.winningDeck?.tournamentDeck.meleePlayerUsername?.trim();

  if (meleePlayerUsername) return meleePlayerUsername;

  return entry.standings.find(row => row.standing.rank === 1)?.player.displayName ?? 'Champion';
}

function TournamentInfoRow({
  entry,
  meleeUrl,
  showProgress,
}: {
  entry: LiveTournamentWeekendTournamentEntry;
  meleeUrl: string | null;
  showProgress: boolean;
}) {
  const countryCode = entry.tournament.location as CountryCode | undefined;
  const formatLabel = formatDataById[entry.tournament.format]?.name ?? 'Unknown format';
  const progressLabel = showProgress ? getRunningProgressLabel(entry) : null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        {countryCode && <Flag countryCode={countryCode} className="h-3 w-5 rounded-sm" />}
        <span>{entry.tournament.location || 'Country unknown'}</span>
        <span>-</span>
        <span>{getPlayerCount(entry)}</span>
      </span>
      <span>{formatLabel}</span>
      {meleeUrl ? (
        <a
          href={meleeUrl}
          target="_blank"
          rel="noreferrer"
          className="flex gap-1 items-center underline"
        >
          Melee
          <ExternalLink className="size-3" />
        </a>
      ) : (
        <span>Melee missing</span>
      )}
      {progressLabel && <span>{progressLabel}</span>}
    </div>
  );
}

function ChampionCallout({ entry }: { entry: LiveTournamentWeekendTournamentEntry }) {
  return (
    <div className="relative z-20 flex w-full max-w-full items-center gap-2 px-3 py-2">
      <Trophy className="h-5 w-5 shrink-0 text-amber-500" />
      <div className="min-w-0">
        <div className="truncate text-xl font-bold leading-tight">{getChampionName(entry)}</div>
      </div>
    </div>
  );
}

export function TournamentCard({
  entry,
}: {
  entry: LiveTournamentWeekendTournamentEntry;
  weekendId: string;
  promptForStream?: boolean;
}) {
  const meleeUrl = getMeleeUrl(entry.tournament.meleeId);
  const startTime = formatDateTime(entry.weekendTournament.exactStart);
  const undefeatedPlayers = getUndefeatedPlayers(entry);
  const bracketRounds = getBracketRounds(entry);
  const isUpcoming = entry.weekendTournament.status === 'upcoming';
  const isRunning = entry.weekendTournament.status === 'running';
  const isFinished = entry.weekendTournament.status === 'finished';

  return (
    <article
      className={cn(
        'relative isolate overflow-hidden rounded-md border bg-background p-3 shadow-xs min-w-[290px] xl:min-w-[340px]',
        'space-y-3',
      )}
    >
      {isFinished && <WinnerDeckDecoration entry={entry} />}

      <div className="relative z-20 flex items-start justify-between gap-3">
        <div
          className={cn('min-w-0 flex-1', {
            'max-w-[calc(100%-150px)]': isFinished && entry.winningDeck,
          })}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h6 className="font-semibold leading-tight">{entry.tournament.name}</h6>
            {!isFinished && <LiveStatusBadge status={entry.weekendTournament.status} />}
            {isUpcoming && startTime && (
              <span className="text-xs text-muted-foreground">{startTime}</span>
            )}
          </div>
          <TournamentInfoRow entry={entry} meleeUrl={meleeUrl} showProgress={isRunning} />
        </div>
        <TournamentCardActionsMenu meleeUrl={meleeUrl} tournamentId={entry.tournament.id} />
      </div>

      {isFinished && <ChampionCallout entry={entry} />}

      {!isFinished && undefeatedPlayers.length > 0 && (
        <div className="relative z-20 flex flex-wrap items-center gap-2">
          <div className="text-xs font-medium uppercase text-muted-foreground">Undefeated</div>
          <div className="flex flex-wrap gap-1.5">
            {undefeatedPlayers.slice(0, 3).map(row => (
              <Badge key={row.player.displayName} variant="outline" className="rounded-md">
                {row.player.displayName} {row.standing.matchRecord}
              </Badge>
            ))}
            {undefeatedPlayers.length > 3 && (
              <Badge variant="outline" className="rounded-md">
                +{undefeatedPlayers.length - 3}
              </Badge>
            )}
          </div>
        </div>
      )}

      <div className="relative z-20">
        <BracketPreview rounds={bracketRounds} />
      </div>
    </article>
  );
}
