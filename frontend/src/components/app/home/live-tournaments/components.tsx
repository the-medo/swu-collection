import { type FormEvent, type ReactNode, useState } from 'react';
import { ExternalLink, Star } from 'lucide-react';
import { useCreateTournamentWeekendResource } from '@/api/tournament-weekends';
import { useUser } from '@/hooks/useUser.ts';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import SectionHeader from '@/components/app/daily-snapshots/sections/components/SectionHeader.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import type {
  LiveTournamentWeekendTournamentEntry,
  TournamentWeekendResource,
  TournamentWeekendResourceType,
} from './liveTournamentTypes.ts';
import {
  type BracketRound,
  formatDateTime,
  getBracketRounds,
  getHostName,
  getMatchProgress,
  getMeleeUrl,
  getPlayerCount,
  getRoundLabel,
  getStatusLabel,
  getUndefeatedPlayers,
} from './liveTournamentUtils.ts';

export function LiveSectionHeader({
  title,
  detail,
  count,
}: {
  title: string;
  detail?: string;
  count?: number;
}) {
  return (
    <SectionHeader
      headerAndTooltips={
        <div className="min-w-0">
          <h4 className="truncate text-base font-semibold">{title}</h4>
          {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
        </div>
      }
      dropdownMenu={
        count !== undefined ? (
          <Badge variant="outline" className="rounded-md">
            {count}
          </Badge>
        ) : undefined
      }
    />
  );
}

function LiveStatusBadge({
  status,
}: {
  status: LiveTournamentWeekendTournamentEntry['weekendTournament']['status'];
}) {
  const variant =
    status === 'running'
      ? 'success'
      : status === 'finished'
        ? 'secondary'
        : status === 'upcoming'
          ? 'warning'
          : 'outline';

  return (
    <Badge variant={variant} className="rounded-md">
      {getStatusLabel(status)}
    </Badge>
  );
}

export function ExternalButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button size="xs" variant="outline" asChild>
      <a href={href} target="_blank" rel="noreferrer">
        {children}
        <ExternalLink className="h-3 w-3" />
      </a>
    </Button>
  );
}

function ResourceLinkList({ resources }: { resources: TournamentWeekendResource[] }) {
  if (resources.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {resources.map(resource => (
        <ExternalButton key={resource.id} href={resource.resourceUrl}>
          {resource.title || getHostName(resource.resourceUrl)}
        </ExternalButton>
      ))}
    </div>
  );
}

function BracketPreview({ rounds }: { rounds: BracketRound[] }) {
  if (rounds.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase text-muted-foreground">Top cut</div>
      <div className="grid gap-2">
        {rounds.map(round => (
          <div key={round.roundName} className="rounded-md border bg-background p-2">
            <div className="mb-2 text-sm font-medium">{round.roundName}</div>
            <div className="space-y-1 text-xs">
              {round.matches.map(match => {
                const score =
                  match.match.player1GameWin !== null && match.match.player2GameWin !== null
                    ? `${match.match.player1GameWin}-${match.match.player2GameWin}`
                    : 'vs';

                return (
                  <div key={match.match.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate">
                      {match.player1?.displayName ?? `Player ${match.match.playerId1}`}
                    </span>
                    <span className="shrink-0 text-muted-foreground">{score}</span>
                    <span className="min-w-0 flex-1 truncate text-right">
                      {match.player2?.displayName ??
                        (match.match.playerId2 ? `Player ${match.match.playerId2}` : 'Bye')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WinningDeck({ entry }: { entry: LiveTournamentWeekendTournamentEntry }) {
  const labelRenderer = useLabel();
  const deck = entry.winningDeck?.deck;

  if (!deck?.leaderCardId1 || !deck.baseCardId) return null;

  const leaderBaseKey = `${deck.leaderCardId1}|${deck.baseCardId}`;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2">
      <Star className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">Winner</span>
      <div className="min-w-0 text-sm">
        {labelRenderer(leaderBaseKey, 'leadersAndBase', 'compact')}
      </div>
    </div>
  );
}

function StreamSubmissionPrompt({
  weekendId,
  tournamentId,
}: {
  weekendId: string;
  tournamentId: string;
}) {
  const user = useUser();
  const [resourceUrl, setResourceUrl] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const createResource = useCreateTournamentWeekendResource(weekendId);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUrl = resourceUrl.trim();
    if (!trimmedUrl) return;

    createResource.mutate(
      {
        tournamentId,
        resourceType: 'stream' satisfies TournamentWeekendResourceType,
        resourceUrl: trimmedUrl,
      },
      {
        onSuccess: () => {
          setResourceUrl('');
          setSubmitted(true);
        },
      },
    );
  };

  if (!user) {
    return (
      <p className="text-xs text-muted-foreground">
        Stream link missing. Sign in to submit a YouTube or Twitch link.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Input
        value={resourceUrl}
        onChange={event => setResourceUrl(event.target.value)}
        placeholder="YouTube or Twitch stream"
        className="h-8 text-xs"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="xs" type="submit" disabled={createResource.isPending}>
          Submit stream
        </Button>
        {submitted && <span className="text-xs text-muted-foreground">Sent for approval</span>}
        {createResource.isError && (
          <span className="text-xs text-destructive">
            {createResource.error?.message ?? 'Stream link was not accepted'}
          </span>
        )}
      </div>
    </form>
  );
}

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
