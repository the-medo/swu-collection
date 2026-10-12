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
          title="Your watchlist"
          detail="Keep your players in sight."
          action={
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                aria-label="Manage watched players"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          }
        />

        {!user ? (
          <div
            className={cn(
              'live-quiet-state m-0 py-5.5 px-4 border border-dashed border-border rounded-[12px]',
              'text-muted-foreground text-[12px] leading-[1.8]!',
            )}
          >
            Sign in to follow players.
          </div>
        ) : detail.watchlist.length === 0 ? (
          <div
            className={cn(
              'live-quiet-state m-0 py-5.5 px-4 border border-dashed border-border rounded-[12px]',
              'text-muted-foreground text-[12px] leading-[1.8]!',
            )}
          >
            Add players to your watchlist to follow their standings and latest matches here.
          </div>
        ) : watchedTournamentGroups.length === 0 ? (
          <div
            className={cn(
              'live-quiet-state m-0 py-5.5 px-4 border border-dashed border-border rounded-[12px]',
              'text-muted-foreground text-[12px] leading-[1.8]!',
            )}
          >
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
                  className={cn(
                    'live-watched-group overflow-hidden border border-border rounded-[10px]',
                    '[&_.text-sm]:text-[11px]',
                    '[&_.text-xs]:text-[10px]',
                  )}
                >
                  <div className="live-watched-group-heading py-2.5 px-3 border-b border-b-border bg-muted/35">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <Flag
                          countryCode={group.tournament.tournament.location as CountryCode}
                          className="h-4 w-5 shrink-0 rounded-sm"
                        />
                        <h6 className="mb-0! truncate text-xs">
                          {group.tournament.tournament.name}
                        </h6>
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
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
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

      <DialogContent className={cn('max-h-[85vh] overflow-y-auto', 'sm:max-w-3xl')}>
        <DialogHeader>
          <DialogTitle>Watched Players</DialogTitle>
        </DialogHeader>
        <WatchedPlayersManager />
      </DialogContent>
    </Dialog>
  );
}
