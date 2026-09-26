import { useState } from 'react';
import { AiTrainingConsent } from './AiTrainingConsent.tsx';
import { Route } from '@/routes/_authenticated/crossfire/index.tsx';
import { useNavigate } from '@tanstack/react-router';
import { MatchupCard } from '@/components/app/global/MatchupCard.tsx';
import { getResultBorderColor } from '@/components/app/statistics/lib/lib.ts';
import { cn } from '@/lib/utils.ts';
import { ReplayButton } from './ReplayButton.tsx';
import { Link } from '@tanstack/react-router';
import { ArrowRight, History } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { useGameHistory } from '@/api/crossfire/useGameHistory.ts';
export function GameHistory({
  sessionId,
  embedded = false,
}: {
  sessionId: string;
  embedded?: boolean;
}) {
  const { cfOpponent } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const query = useGameHistory(sessionId, undefined, cfOpponent);
  const games = query.data?.pages.flatMap(page => page.data) ?? [];
  const [visibleCount, setVisibleCount] = useState(10);
  const loadMore = async () => {
    if (games.length < visibleCount + 10 && query.hasNextPage) {
      const result = await query.fetchNextPage();
      if (result.isError) return;
    }
    setVisibleCount(count => count + 10);
  };
  return (
    <section
      className={
        embedded ? 'cf-activity-panel space-y-4' : 'space-y-4 rounded-xl border bg-card p-5 sm:p-6'
      }
      aria-labelledby="crossfire-history-title"
    >
      <h2
        id="crossfire-history-title"
        className={embedded ? 'sr-only' : 'flex items-center gap-2 text-xl font-semibold'}
      >
        <History size={20} />
        Your games
      </h2>
      <label className="flex flex-wrap items-center gap-2 text-sm">
        Opponent
        <select
          aria-label="Filter game opponents"
          className="h-9 rounded-md border bg-background px-2"
          value={cfOpponent ?? 'all'}
          onChange={event => {
            const value = event.target.value;
            setVisibleCount(10);
            void navigate({
              search: prev => ({
                ...prev,
                cfOpponent: value === 'all' ? undefined : (value as 'human' | 'ai'),
              }),
            });
          }}
        >
          <option value="all">All games</option>
          <option value="human">People</option>
          <option value="ai">AI opponents</option>
        </select>
      </label>
      {query.isPending ? (
        <p role="status">Loading your games…</p>
      ) : query.isError && !games.length ? (
        <div role="alert">
          <p>Could not load your games.</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          {!games.length && (
            <p className="text-sm text-muted-foreground">
              {cfOpponent
                ? 'No games match this filter yet.'
                : 'Your games will appear here once they start. Open any game to review its history.'}
            </p>
          )}
          <div className="cf-game-list" aria-label="Recent Crossfire games">
            {games.slice(0, visibleCount).map(game => (
              <article key={game.gameId}>
                <MatchupCard
                  leaderCardId={game.leaders?.[0]}
                  baseCardKey={game.bases?.[0]}
                  opponentLeaderCardId={game.leaders?.[1]}
                  opponentBaseCardKey={game.bases?.[1]}
                  className="cf-recent-game-card"
                  contentClassName="cf-recent-game-content"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className="flex min-w-0 items-baseline gap-1 text-sm font-medium"
                      title={`vs. ${game.opponent}`}
                    >
                      <span
                        className={cn(
                          'shrink-0 max-w-[calc(100%_-_4px)] truncate border-b-2 font-semibold',
                          getResultBorderColor(
                            game.result
                              ? game.result.winner === null
                                ? 1
                                : game.result.winner === game.mySeat
                                  ? 3
                                  : 0
                              : undefined,
                          ),
                        )}
                      >
                        {game.result
                          ? game.result.winner === null
                            ? 'Draw'
                            : game.result.winner === game.mySeat
                              ? 'Won'
                              : 'Lost'
                          : game.status === 'abandoned'
                            ? 'Abandoned'
                            : 'In progress'}
                      </span>
                      <span className="truncate">
                        {game.ai ? 'AI · ' : ''}vs. {game.opponent}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {game.ai
                        ? 'AI practice · '
                        : game.practice
                          ? 'Practice from bookmark · '
                          : 'Crossfire · '}
                      {new Date(game.startedAt).toLocaleString()} ·{' '}
                      {game.status === 'abandoned'
                        ? 'Abandoned — incompatible version'
                        : game.exit?.status === 'pending'
                          ? 'Leaving…'
                          : game.result
                            ? `Round ${game.round}`
                            : 'In progress'}
                      {game.exit?.status === 'forfeit' &&
                        ` · ${game.exit.seat === game.mySeat ? 'Match forfeited' : 'Opponent forfeited match'}`}
                      {game.compatible === false &&
                        game.status !== 'abandoned' &&
                        ' · Older version'}
                    </p>
                    {game.ai && (
                      <p className="text-xs text-muted-foreground">
                        {game.ai.releaseLabel} · Excluded from player statistics
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1 cf-recent-game-actions">
                    {!game.ai && <AiTrainingConsent gameId={game.gameId} sessionId={sessionId} />}
                    {game.status === 'running' && (
                      <Button
                        size="xs"
                        variant="outline"
                        asChild
                        className="@max-[440px]:size-8 @max-[440px]:p-0"
                      >
                        <Link
                          to="/crossfire/$lobbyId"
                          params={{ lobbyId: game.lobbyId }}
                          aria-label="Return to game"
                        >
                          <ArrowRight aria-hidden="true" className="@min-[441px]:hidden" />
                          <span className="@max-[440px]:sr-only">Return</span>
                        </Link>
                      </Button>
                    )}
                    {game.replayAvailable !== false &&
                    game.compatible !== false &&
                    game.status !== 'abandoned' ? (
                      <ReplayButton lobbyId={game.lobbyId} compact />
                    ) : (
                      <span className="self-center text-xs text-muted-foreground">
                        {game.replayAvailable === false
                          ? 'Replay expired · result retained'
                          : 'Replay unavailable'}
                      </span>
                    )}
                  </div>
                </MatchupCard>
              </article>
            ))}
          </div>
          {query.isError && <p role="alert">Could not load more games. Please try again.</p>}
          {(games.length > visibleCount || query.hasNextPage) && (
            <Button
              variant="outline"
              disabled={query.isFetchingNextPage}
              onClick={() => void loadMore()}
            >
              {query.isFetchingNextPage ? 'Loading…' : 'Load 10 more games'}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
