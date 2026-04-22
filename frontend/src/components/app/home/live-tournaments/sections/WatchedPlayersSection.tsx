import { useMemo } from 'react';
import { Pencil } from 'lucide-react';
import Flag from '@/components/app/global/Flag.tsx';
import { WatchedPlayersManager } from '@/components/app/player-watch/WatchedPlayersManager.tsx';
import { Button } from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { cn } from '@/lib/utils.ts';
import { LiveSectionHeader } from '../components';
import type { CountryCode } from '../../../../../../../server/db/lists.ts';
import type {
  LiveTournamentMatchEntry,
  LiveTournamentWeekendDetail,
} from '../liveTournamentTypes.ts';
import { getLiveMatchWinnerSide, getRoundLabel } from '../liveTournamentUtils.ts';
import { LiveTournamentStandingEntry } from '../../../../../../../types/TournamentWeekend.ts';

type WatchedPlayerEntry = LiveTournamentWeekendDetail['watchedPlayers'][number];

function getLatestStanding(
  entry: WatchedPlayerEntry,
  tournamentId: string,
): LiveTournamentStandingEntry | null {
  let latestStanding: LiveTournamentStandingEntry | null = null;

  for (const standing of entry.standings) {
    if (standing.standing.tournamentId !== tournamentId) continue;

    if (
      latestStanding === null ||
      standing.standing.roundNumber > latestStanding.standing.roundNumber
    ) {
      latestStanding = standing;
    }
  }

  return latestStanding;
}

function getMatchTimestamp(match: LiveTournamentMatchEntry) {
  const value = match.match.updatedAt ?? match.match.createdAt;
  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getLatestMatch(
  entry: WatchedPlayerEntry,
  tournamentId: string,
): LiveTournamentMatchEntry | null {
  let latestMatch: LiveTournamentMatchEntry | null = null;

  for (const match of entry.matches) {
    if (match.match.tournamentId !== tournamentId) continue;
    const matchTimestamp = getMatchTimestamp(match);
    const latestMatchTimestamp = latestMatch ? getMatchTimestamp(latestMatch) : -1;

    if (
      latestMatch === null ||
      match.match.roundNumber > latestMatch.match.roundNumber ||
      (match.match.roundNumber === latestMatch.match.roundNumber &&
        matchTimestamp > latestMatchTimestamp) ||
      (match.match.roundNumber === latestMatch.match.roundNumber &&
        matchTimestamp === latestMatchTimestamp &&
        match.match.matchKey.localeCompare(latestMatch.match.matchKey) > 0)
    ) {
      latestMatch = match;
    }
  }

  return latestMatch;
}

function getLatestMatchSummary(playerDisplayName: string, latestMatch: LiveTournamentMatchEntry) {
  const playerSide =
    latestMatch.match.playerDisplayName1 === playerDisplayName ? 'player1' : 'player2';
  const isPlayer1 = playerSide === 'player1';
  const opponentName = isPlayer1
    ? (latestMatch.player2?.displayName ?? latestMatch.match.playerDisplayName2 ?? 'TBD')
    : (latestMatch.player1?.displayName ?? latestMatch.match.playerDisplayName1);
  const playerWins = isPlayer1
    ? latestMatch.match.player1GameWin
    : latestMatch.match.player2GameWin;
  const opponentWins = isPlayer1
    ? latestMatch.match.player2GameWin
    : latestMatch.match.player1GameWin;
  const winnerSide = getLiveMatchWinnerSide(latestMatch);
  const outcome = winnerSide === null ? null : winnerSide === playerSide ? 'win' : 'loss';

  return {
    resultLabel:
      playerWins !== null && opponentWins !== null
        ? `${playerWins}:${opponentWins} ${opponentName}`
        : `vs ${opponentName}`,
    outcome,
  };
}

export function WatchedPlayersSection({ detail }: { detail: LiveTournamentWeekendDetail }) {
  const user = useUser();
  const watchedTournamentGroups = useMemo(
    () =>
      detail.tournaments.flatMap(tournament => {
        const players = detail.watchedPlayers
          .flatMap(entry => {
            const standing = getLatestStanding(entry, tournament.tournament.id);
            const latestMatch = getLatestMatch(entry, tournament.tournament.id);

            if (standing === null && latestMatch === null) return [];

            return [
              {
                displayName: entry.player.displayName,
                standing,
                latestMatch,
              },
            ];
          })
          .sort((left, right) => {
            if (left.standing && right.standing) {
              return left.standing.standing.rank - right.standing.standing.rank;
            }

            if (left.standing) return -1;
            if (right.standing) return 1;

            const leftLatestRound = left.latestMatch?.match.roundNumber ?? -1;
            const rightLatestRound = right.latestMatch?.match.roundNumber ?? -1;

            if (leftLatestRound !== rightLatestRound) {
              return rightLatestRound - leftLatestRound;
            }

            return left.displayName.localeCompare(right.displayName);
          });

        if (players.length === 0) return [];

        return [
          {
            tournament,
            players,
          },
        ];
      }),
    [detail.tournaments, detail.watchedPlayers],
  );

  return (
    <Dialog>
      <section className="flex w-full flex-col gap-3">
        <LiveSectionHeader
          title="Watched Players"
          action={
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0 -mt-2">
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          }
        />

        {!user ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Sign in to follow players.
          </div>
        ) : detail.watchlist.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            You are not watching any players yet. Use the pencil button above to manage your
            watchlist.
          </div>
        ) : watchedTournamentGroups.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            None of your watched players are active in the current live tournament weekend.
          </div>
        ) : (
          <div className="grid gap-3">
            {watchedTournamentGroups.map(group => {
              const roundLabel =
                group.tournament.weekendTournament.status === 'finished'
                  ? null
                  : getRoundLabel(group.tournament);

              return (
                <div
                  key={group.tournament.tournament.id}
                  className="overflow-hidden rounded-md border"
                >
                  <div className="border-b bg-background px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Flag
                          countryCode={group.tournament.tournament.location as CountryCode}
                          className="h-4 w-5 shrink-0 rounded-sm"
                        />
                        <h6 className="mb-0! truncate">{group.tournament.tournament.name}</h6>
                      </div>

                      {roundLabel && (
                        <div className="shrink-0 text-xs text-muted-foreground">{roundLabel}</div>
                      )}
                    </div>
                  </div>

                  <div className="divide-y">
                    {group.players.map(player => {
                      const latestMatchSummary = player.latestMatch
                        ? getLatestMatchSummary(player.displayName, player.latestMatch)
                        : null;

                      return (
                        <div
                          key={`${group.tournament.tournament.id}-${player.displayName}`}
                          className={cn(
                            'px-3 py-2 text-sm transition-colors',
                            latestMatchSummary?.outcome === 'win' &&
                              'bg-green-50/70 dark:bg-green-950/20',
                            latestMatchSummary?.outcome === 'loss' &&
                              'bg-red-50/70 dark:bg-red-950/20',
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="truncate font-medium">{player.displayName}</div>

                              {player.standing && (
                                <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                  #{player.standing.standing.rank} -{' '}
                                  {player.standing.standing.matchRecord}
                                </div>
                              )}
                            </div>

                            {latestMatchSummary && (
                              <div
                                className={cn(
                                  'shrink-0 text-xs tabular-nums',
                                  latestMatchSummary.outcome === 'win' &&
                                    'font-medium text-green-700 dark:text-green-300',
                                  latestMatchSummary.outcome === 'loss' &&
                                    'font-medium text-red-700 dark:text-red-300',
                                  latestMatchSummary.outcome === null && 'text-muted-foreground',
                                )}
                              >
                                {latestMatchSummary.resultLabel}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Watched Players</DialogTitle>
        </DialogHeader>
        <WatchedPlayersManager />
      </DialogContent>
    </Dialog>
  );
}
