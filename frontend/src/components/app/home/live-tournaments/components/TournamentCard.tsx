import { Badge } from '@/components/ui/badge.tsx';
import type { LiveTournamentWeekendTournamentEntry } from '../liveTournamentTypes.ts';
import {
  formatDateTime,
  getBracketRounds,
  getMatchProgress,
  getMeleeUrl,
  getPlayerCount,
  getRoundLabel,
  getUndefeatedPlayers,
} from '../liveTournamentUtils.ts';
import { BracketPreview } from './BracketPreview.tsx';
import { ExternalButton } from './ExternalButton.tsx';
import { LiveStatusBadge } from './LiveStatusBadge.tsx';
import { ResourceLinkList } from './ResourceLinkList.tsx';
import { StreamSubmissionPrompt } from './StreamSubmissionPrompt.tsx';
import { WinningDeck } from './WinningDeck.tsx';

export function TournamentCard({
  entry,
  weekendId,
  promptForStream = false,
}: {
  entry: LiveTournamentWeekendTournamentEntry;
  weekendId: string;
  promptForStream?: boolean;
}) {
  const meleeUrl = getMeleeUrl(entry.tournament.meleeId);
  const roundLabel = getRoundLabel(entry);
  const matchProgress = getMatchProgress(entry);
  const startTime = formatDateTime(entry.weekendTournament.exactStart);
  const updatedAt = formatDateTime(entry.weekendTournament.lastUpdatedAt);
  const undefeatedPlayers = getUndefeatedPlayers(entry);
  const bracketRounds = getBracketRounds(entry);
  const hasStreams = entry.resources.length > 0;

  return (
    <article className="space-y-3 rounded-md border bg-background p-3 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold">{entry.tournament.name}</h3>
            <LiveStatusBadge status={entry.weekendTournament.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            {entry.tournament.location || 'Country unknown'} - {getPlayerCount(entry)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {meleeUrl && <ExternalButton href={meleeUrl}>Melee</ExternalButton>}
          <ResourceLinkList resources={entry.resources} />
        </div>
      </div>

      <div className="grid gap-2 text-sm sm:grid-cols-2">
        {roundLabel && (
          <div>
            <div className="text-xs text-muted-foreground">Round</div>
            <div>{roundLabel}</div>
          </div>
        )}
        {matchProgress && (
          <div>
            <div className="text-xs text-muted-foreground">Matches</div>
            <div>{matchProgress}</div>
          </div>
        )}
        {startTime && (
          <div>
            <div className="text-xs text-muted-foreground">Start</div>
            <div>{startTime}</div>
          </div>
        )}
        {updatedAt && (
          <div>
            <div className="text-xs text-muted-foreground">Updated</div>
            <div>{updatedAt}</div>
          </div>
        )}
      </div>

      {undefeatedPlayers.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase text-muted-foreground">Undefeated</div>
          <div className="flex flex-wrap gap-1.5">
            {undefeatedPlayers.slice(0, 12).map(row => (
              <Badge key={row.player.id} variant="outline" className="rounded-md">
                {row.player.displayName} {row.standing.matchRecord}
              </Badge>
            ))}
            {undefeatedPlayers.length > 12 && (
              <Badge variant="outline" className="rounded-md">
                +{undefeatedPlayers.length - 12}
              </Badge>
            )}
          </div>
        </div>
      )}

      <BracketPreview rounds={bracketRounds} />

      {entry.weekendTournament.status === 'finished' && <WinningDeck entry={entry} />}

      {!meleeUrl && (
        <p className="text-xs text-muted-foreground">
          Melee link missing. Send the tournament link so live data can be checked.
        </p>
      )}

      {promptForStream && !hasStreams && (
        <StreamSubmissionPrompt weekendId={weekendId} tournamentId={entry.tournament.id} />
      )}
    </article>
  );
}
