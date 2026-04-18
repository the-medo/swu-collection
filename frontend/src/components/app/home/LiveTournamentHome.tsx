import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ResponsivePie } from '@nivo/pie';
import { ExternalLink, Loader2, Radio, Star, Trash2 } from 'lucide-react';
import {
  useCreateTournamentWeekendResource,
  useLiveTournamentWeekend,
} from '@/api/tournament-weekends';
import { useDeletePlayerWatch, usePostPlayerWatch } from '@/api/player-watch';
import { useUser } from '@/hooks/useUser.ts';
import { cn } from '@/lib/utils.ts';
import { useLabel } from '@/components/app/tournaments/TournamentMeta/useLabel.tsx';
import { useChartColorsAndGradients } from '@/components/app/tournaments/TournamentMeta/useChartColorsAndGradients.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import type {
  LiveTournamentMatchEntry,
  LiveTournamentWeekendDetail,
  LiveTournamentWeekendTournamentEntry,
  TournamentWeekendResourceType,
} from '../../../../../types/TournamentWeekend.ts';
import type { TournamentWeekendResource } from '../../../../../server/db/schema/tournament_weekend.ts';

const topCutRoundNames = new Set(['Quarterfinals', 'Semifinals', 'Finals']);
const topCutRoundOrder = ['Quarterfinals', 'Semifinals', 'Finals'];

type BracketRound = {
  roundName: string;
  matches: LiveTournamentMatchEntry[];
};

type MetaPieItem = {
  id: string;
  label: string;
  value: number;
  data: {
    total: number;
    top8: number;
    winners: number;
  };
};

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getMeleeUrl(meleeId: string | null | undefined) {
  return meleeId ? `https://melee.gg/Tournament/View/${meleeId}` : null;
}

function getHostName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function parseAdditionalData(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getRoundNameMap(entry: LiveTournamentWeekendTournamentEntry) {
  const additionalData = parseAdditionalData(entry.weekendTournament.additionalData);
  const liveRounds = additionalData.liveRounds;
  const roundNameByNumber = new Map<number, string>();

  if (Array.isArray(liveRounds)) {
    liveRounds.forEach(round => {
      if (
        typeof round === 'object' &&
        round !== null &&
        typeof (round as { number?: unknown }).number === 'number' &&
        typeof (round as { name?: unknown }).name === 'string'
      ) {
        roundNameByNumber.set(
          (round as { number: number }).number,
          (round as { name: string }).name,
        );
      }
    });
  }

  if (entry.weekendTournament.roundNumber && entry.weekendTournament.roundName) {
    roundNameByNumber.set(entry.weekendTournament.roundNumber, entry.weekendTournament.roundName);
  }

  return roundNameByNumber;
}

function getBracketRounds(entry: LiveTournamentWeekendTournamentEntry): BracketRound[] {
  const roundNameByNumber = getRoundNameMap(entry);
  const roundsByName = new Map<string, LiveTournamentMatchEntry[]>();

  entry.matches.forEach(match => {
    const roundName = roundNameByNumber.get(match.match.roundNumber);
    if (!roundName || !topCutRoundNames.has(roundName)) return;

    const existing = roundsByName.get(roundName);
    if (existing) {
      existing.push(match);
      return;
    }

    roundsByName.set(roundName, [match]);
  });

  return [...roundsByName.entries()]
    .map(([roundName, matches]) => ({ roundName, matches }))
    .sort(
      (a, b) =>
        topCutRoundOrder.indexOf(a.roundName) - topCutRoundOrder.indexOf(b.roundName),
    );
}

function getMatchLosses(matchRecord: string) {
  const [, losses] = matchRecord.split('-').map(value => Number.parseInt(value, 10));
  return Number.isFinite(losses) ? losses : null;
}

function getUndefeatedPlayers(entry: LiveTournamentWeekendTournamentEntry) {
  const roundNumber = entry.weekendTournament.roundNumber ?? 0;
  if (roundNumber < 4) return [];

  return entry.standings.filter(row => getMatchLosses(row.standing.matchRecord) === 0);
}

function getRoundLabel(entry: LiveTournamentWeekendTournamentEntry) {
  if (entry.weekendTournament.roundName) return entry.weekendTournament.roundName;
  if (entry.weekendTournament.roundNumber) return `Round ${entry.weekendTournament.roundNumber}`;
  return null;
}

function getMatchProgress(entry: LiveTournamentWeekendTournamentEntry) {
  const remaining = entry.weekendTournament.matchesRemaining;
  const total = entry.weekendTournament.matchesTotal;

  if (remaining === null || remaining === undefined) return null;
  if (total === null || total === undefined) return `${remaining} remaining`;

  return `${remaining} / ${total} remaining`;
}

function getPlayerCount(entry: LiveTournamentWeekendTournamentEntry) {
  const playerCount = entry.tournament.attendance;
  if (playerCount === null || playerCount === undefined) return 'Players unknown';
  return `${playerCount} players`;
}

function getStatusLabel(status: LiveTournamentWeekendTournamentEntry['weekendTournament']['status']) {
  switch (status) {
    case 'running':
      return 'Running';
    case 'finished':
      return 'Finished';
    case 'upcoming':
      return 'Upcoming';
    case 'unknown':
      return 'Unknown';
  }
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

function ExternalButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button size="xs" variant="outline" asChild>
      <a href={href} target="_blank" rel="noreferrer">
        {children}
        <ExternalLink className="h-3 w-3" />
      </a>
    </Button>
  );
}

function SectionHeading({
  title,
  detail,
  count,
}: {
  title: string;
  detail?: string;
  count?: number;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
      </div>
      {count !== undefined && (
        <Badge variant="outline" className="rounded-md">
          {count}
        </Badge>
      )}
    </div>
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
      <div className="grid gap-2 md:grid-cols-3">
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        value={resourceUrl}
        onChange={event => setResourceUrl(event.target.value)}
        placeholder="YouTube or Twitch stream"
        className="h-8 text-xs"
      />
      <Button size="xs" type="submit" disabled={createResource.isPending}>
        Submit stream
      </Button>
      {submitted && (
        <span className="self-center text-xs text-muted-foreground">Sent for approval</span>
      )}
      {createResource.isError && (
        <span className="self-center text-xs text-destructive">
          {createResource.error?.message ?? 'Stream link was not accepted'}
        </span>
      )}
    </form>
  );
}

function TournamentCard({
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
    <article className="space-y-3 rounded-md border bg-card p-3 shadow-xs">
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

      <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
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

function TournamentSection({
  title,
  detail,
  tournaments,
  weekendId,
  promptForStream = false,
}: {
  title: string;
  detail?: string;
  tournaments: LiveTournamentWeekendTournamentEntry[];
  weekendId: string;
  promptForStream?: boolean;
}) {
  return (
    <section className="space-y-3">
      <SectionHeading title={title} detail={detail} count={tournaments.length} />
      {tournaments.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Nothing here right now.
        </div>
      ) : (
        <div className="grid gap-3">
          {tournaments.map(entry => (
            <TournamentCard
              key={entry.tournament.id}
              entry={entry}
              weekendId={weekendId}
              promptForStream={promptForStream}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function WeekendHeader({ detail }: { detail: LiveTournamentWeekendDetail }) {
  const lastUpdated = useMemo(() => {
    const timestamps = [
      detail.weekend.updatedAt,
      ...detail.tournaments.map(entry => entry.weekendTournament.lastUpdatedAt),
    ]
      .filter(Boolean)
      .map(value => new Date(value as string).getTime())
      .filter(value => !Number.isNaN(value));

    if (timestamps.length === 0) return null;
    return formatDateTime(new Date(Math.max(...timestamps)));
  }, [detail]);

  const meleeLinks = detail.tournaments
    .map(entry => ({
      id: entry.tournament.id,
      name: entry.tournament.name,
      url: getMeleeUrl(entry.tournament.meleeId),
    }))
    .filter((entry): entry is { id: string; name: string; url: string } => Boolean(entry.url));

  const streams = detail.resources.slice(0, 3);

  return (
    <section className="space-y-4 border-b pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">
            {formatDate(detail.weekend.date) ?? detail.weekend.date}
          </div>
          <h1 className="text-2xl font-semibold">{detail.weekend.name}</h1>
          {lastUpdated && <p className="text-sm text-muted-foreground">Last update {lastUpdated}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {meleeLinks.slice(0, 3).map(link => (
            <ExternalButton key={link.id} href={link.url}>
              {link.name}
            </ExternalButton>
          ))}
          {streams.map(resource => (
            <ExternalButton key={resource.id} href={resource.resourceUrl}>
              {resource.title || getHostName(resource.resourceUrl)}
            </ExternalButton>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <CountTile label="Running" value={detail.weekend.tournamentsRunning} />
        <CountTile label="Finished" value={detail.weekend.tournamentsFinished} />
        <CountTile label="Upcoming" value={detail.weekend.tournamentsUpcoming} />
        <CountTile label="Unknown" value={detail.weekend.tournamentsUnknown} />
      </div>
    </section>
  );
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function StreamsPanel({ detail }: { detail: LiveTournamentWeekendDetail }) {
  const tournamentsById = new Map(detail.tournaments.map(entry => [entry.tournament.id, entry]));
  const preparedResources = detail.resources.filter(resource => {
    const status = tournamentsById.get(resource.tournamentId)?.weekendTournament.status;
    return status === 'running' || status === 'upcoming' || status === 'unknown';
  });
  const resources = preparedResources.length > 0 ? preparedResources : detail.resources;

  return (
    <section className="space-y-3">
      <SectionHeading title="Streams" detail="Approved live and prepared links." count={resources.length} />
      {resources.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No approved stream links yet.
        </div>
      ) : (
        <div className="grid gap-2">
          {resources.map(resource => {
            const tournament = tournamentsById.get(resource.tournamentId)?.tournament;
            return (
              <a
                key={resource.id}
                href={resource.resourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-md border bg-card p-3 text-sm hover:bg-accent"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {resource.title || getHostName(resource.resourceUrl)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {tournament?.name ?? 'Tournament stream'}
                  </span>
                </span>
                <Radio className="h-4 w-4 shrink-0 text-primary" />
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}

function WatchedPlayersPanel({ detail }: { detail: LiveTournamentWeekendDetail }) {
  const user = useUser();
  const [watchValue, setWatchValue] = useState('');
  const addWatch = usePostPlayerWatch();
  const removeWatch = useDeletePlayerWatch();
  const activeWatchedPlayers = detail.watchedPlayers.filter(
    entry => entry.standings.length > 0 || entry.matches.length > 0,
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = watchValue.trim();
    if (!value) return;

    const numericValue = Number.parseInt(value, 10);
    addWatch.mutate(
      Number.isFinite(numericValue) && numericValue.toString() === value
        ? { playerId: numericValue }
        : { displayName: value },
      {
        onSuccess: () => setWatchValue(''),
      },
    );
  };

  return (
    <section className="space-y-3">
      <SectionHeading
        title="Watched Players"
        detail="Players from your list who are active this weekend."
        count={activeWatchedPlayers.length}
      />

      {!user ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Sign in to follow Melee players.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={watchValue}
            onChange={event => setWatchValue(event.target.value)}
            placeholder="Melee id or exact name"
            className="h-8 text-xs"
          />
          <Button size="xs" type="submit" disabled={addWatch.isPending}>
            Add
          </Button>
        </form>
      )}

      {addWatch.isError && (
        <p className="text-xs text-destructive">
          {addWatch.error?.message ?? 'Player could not be added'}
        </p>
      )}

      {activeWatchedPlayers.length > 0 && (
        <div className="grid gap-2">
          {activeWatchedPlayers.map(entry => (
            <div key={entry.player.id} className="rounded-md border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{entry.player.displayName}</div>
                  <div className="text-xs text-muted-foreground">Melee ID {entry.player.id}</div>
                </div>
                <Button
                  size="iconSmall"
                  variant="ghost"
                  onClick={() => removeWatch.mutate(entry.player.id)}
                  disabled={removeWatch.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                {entry.standings.slice(0, 3).map(row => (
                  <Badge
                    key={`${row.standing.tournamentId}-${row.standing.roundNumber}`}
                    variant="outline"
                    className="rounded-md"
                  >
                    Rank {row.standing.rank}, {row.standing.matchRecord}
                  </Badge>
                ))}
                {entry.matches.length > 0 && (
                  <Badge variant="outline" className="rounded-md">
                    {entry.matches.length} live matches
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {user && detail.watchlist.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {detail.watchlist.map(entry => (
            <Badge key={entry.player.id} variant="outline" className="gap-1 rounded-md">
              {entry.player.displayName}
              <button
                type="button"
                className="ml-1 text-muted-foreground hover:text-foreground"
                onClick={() => removeWatch.mutate(entry.player.id)}
              >
                x
              </button>
            </Badge>
          ))}
        </div>
      )}
    </section>
  );
}

function WeekendMetaPieChart({ detail }: { detail: LiveTournamentWeekendDetail }) {
  const labelRenderer = useLabel();
  const pieChartColorDefinitions = useChartColorsAndGradients();

  const metaRows = useMemo(() => {
    const rowsByKey = new Map<string, MetaPieItem>();

    detail.tournamentGroups.forEach(group => {
      group.leaderBase.forEach(row => {
        const key =
          row.leaderCardId === 'others'
            ? 'Others'
            : row.leaderCardId === 'unknown'
              ? 'unknown'
              : `${row.leaderCardId}|${row.baseCardId}`;
        const existing = rowsByKey.get(key);

        if (existing) {
          existing.value += row.total;
          existing.data.total += row.total;
          existing.data.top8 += row.top8;
          existing.data.winners += row.winner;
          return;
        }

        rowsByKey.set(key, {
          id: key,
          label: key,
          value: row.total,
          data: {
            total: row.total,
            top8: row.top8,
            winners: row.winner,
          },
        });
      });
    });

    return [...rowsByKey.values()].sort((a, b) => b.value - a.value);
  }, [detail.tournamentGroups]);

  const chartData = useMemo(() => {
    const topItems = metaRows.slice(0, 20).map(row => ({
      ...row,
      data: { ...row.data },
    }));
    const remaining = metaRows.slice(20);
    const remainingTotal = remaining.reduce((sum, row) => sum + row.value, 0);

    if (remainingTotal === 0) return topItems;

    const remainingData = remaining.reduce(
      (acc, row) => {
        acc.total += row.data.total;
        acc.top8 += row.data.top8;
        acc.winners += row.data.winners;
        return acc;
      },
      { total: 0, top8: 0, winners: 0 },
    );
    const existingOthers = topItems.find(row => row.id === 'Others');

    if (existingOthers) {
      existingOthers.value += remainingTotal;
      existingOthers.data.total += remainingData.total;
      existingOthers.data.top8 += remainingData.top8;
      existingOthers.data.winners += remainingData.winners;
      return topItems;
    }

    return [
      ...topItems,
      {
        id: 'Others',
        label: 'Others',
        value: remainingTotal,
        data: remainingData,
      },
    ];
  }, [metaRows]);

  const totalDecks = metaRows.reduce((sum, row) => sum + row.value, 0);
  const chartDefs = useMemo(
    () => chartData.map(item => pieChartColorDefinitions(item.id, 'leadersAndBase')),
    [chartData, pieChartColorDefinitions],
  );
  const fill = useMemo(
    () =>
      chartData.map(item => ({
        match: { id: item.id },
        id: item.id,
      })),
    [chartData],
  );
  const groupNames = detail.tournamentGroups.map(group => group.tournamentGroup.name).join(', ');

  return (
    <section className="space-y-3">
      <SectionHeading title="Weekend Meta" detail={groupNames || 'Attached tournament groups.'} />
      {chartData.length === 0 || totalDecks === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Meta data will appear after attached tournament groups have leader/base statistics.
        </div>
      ) : (
        <div className="rounded-md border bg-card p-3">
          <div className="h-[320px] w-full">
            <ResponsivePie
              data={chartData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              innerRadius={0.5}
              padAngle={0.7}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              arcLinkLabelsSkipAngle={10}
              colors={['#3B3B3B']}
              arcLinkLabelsThickness={0}
              arcLinkLabel={() => ''}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor="#fff"
              defs={chartDefs}
              fill={fill}
              tooltip={({ datum }) => {
                const data = datum.data as MetaPieItem;

                return (
                  <div className="rounded-md border bg-card p-2 text-sm shadow-md">
                    <div className="flex items-center gap-2">
                      {labelRenderer(datum.id as string, 'leadersAndBase', 'compact')}
                      <span className="font-bold">{datum.value}</span>
                      <span className="text-xs">
                        ({((Number(datum.value) / totalDecks) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Top 8: {data.data.top8} | Winners: {data.data.winners}
                    </div>
                  </div>
                );
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

export default function LiveTournamentHome() {
  const user = useUser();
  const { data, isLoading, isError, error, isFetching } = useLiveTournamentWeekend({
    refetchInterval: user ? false : 60 * 1000,
  });
  const detail = data?.data ?? null;

  const groupedTournaments = useMemo(() => {
    const tournaments = detail?.tournaments ?? [];
    return {
      running: tournaments.filter(entry => entry.weekendTournament.status === 'running'),
      finished: tournaments.filter(entry => entry.weekendTournament.status === 'finished'),
      upcomingOrUnknown: tournaments.filter(
        entry =>
          entry.weekendTournament.status === 'upcoming' ||
          entry.weekendTournament.status === 'unknown',
      ),
    };
  }, [detail]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading live weekend...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-destructive">
        {error?.message ?? 'Failed to load live tournament weekend.'}
      </div>
    );
  }

  if (!detail) {
    return (
      <>
        <Helmet title="Live Tournaments | SWUBase" />
        <div className="space-y-3 p-2">
          <h1 className="text-2xl font-semibold">Live Tournaments</h1>
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No live tournament weekend is active right now. Snapshot mode is still available.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet title={`${detail.weekend.name} | SWUBase Live Tournaments`} />
      <div className="space-y-6 p-2">
        <WeekendHeader detail={detail} />

        {isFetching && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Refreshing live data...
          </div>
        )}

        <div className={cn('grid gap-6', 'xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]')}>
          <div className="space-y-6">
            <TournamentSection
              title="Running Tournaments"
              detail="Current rounds, match progress, undefeated players, and top cut brackets."
              tournaments={groupedTournaments.running}
              weekendId={detail.weekend.id}
              promptForStream
            />
            <TournamentSection
              title="Finished Tournaments"
              detail="Final brackets, links, and imported champion decks."
              tournaments={groupedTournaments.finished}
              weekendId={detail.weekend.id}
            />
            <TournamentSection
              title="Upcoming And Unknown"
              detail="Start times, missing Melee links, and stream submissions."
              tournaments={groupedTournaments.upcomingOrUnknown}
              weekendId={detail.weekend.id}
              promptForStream
            />
          </div>

          <div className="space-y-6">
            <StreamsPanel detail={detail} />
            <WatchedPlayersPanel detail={detail} />
            <WeekendMetaPieChart detail={detail} />
          </div>
        </div>
      </div>
    </>
  );
}
