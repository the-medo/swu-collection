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
import type { LiveTournamentWeekendDetail } from '../liveTournamentTypes.ts';
import { getRoundLabel } from '../liveTournamentUtils.ts';
import type { LiveTournamentHomeWatchedMatch } from '../../../../../../../types/TournamentWeekend.ts';

function getLatestMatchSummary(latestMatch: LiveTournamentHomeWatchedMatch) {
  return {
    resultLabel:
      latestMatch.playerGameWins !== null && latestMatch.opponentGameWins !== null
        ? `${latestMatch.playerGameWins}:${latestMatch.opponentGameWins} ${latestMatch.opponentDisplayName ?? 'TBD'}`
        : `vs ${latestMatch.opponentDisplayName ?? 'TBD'}`,
    outcome: latestMatch.outcome,
  };
}

export function WatchedPlayersSection({ detail }: { detail: LiveTournamentWeekendDetail }) {
  const user = useUser();
  const watchedTournamentGroups = useMemo(
    () =>
      detail.tournaments.flatMap(tournament => {
        const players = detail.watchedPlayers
          .flatMap(entry => {
            const watchedTournament = entry.tournaments.find(
              watchedEntry => watchedEntry.tournamentId === tournament.tournament.id,
            );
            const standing = watchedTournament?.standing ?? null;
            const latestMatch = watchedTournament?.latestMatch ?? null;

            if (standing === null && latestMatch === null) return [];

            return [
              {
                displayName: entry.displayName,
                standing,
                latestMatch,
              },
            ];
          })
          .sort((left, right) => {
            if (left.standing && right.standing) {
              return left.standing.rank - right.standing.rank;
            }

            if (left.standing) return -1;
            if (right.standing) return 1;

            const leftLatestRound = left.latestMatch?.roundNumber ?? -1;
            const rightLatestRound = right.latestMatch?.roundNumber ?? -1;

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
                        ? getLatestMatchSummary(player.latestMatch)
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
                                  #{player.standing.rank} - {player.standing.matchRecord}
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
