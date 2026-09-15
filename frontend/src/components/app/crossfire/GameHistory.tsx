import { ActivityRow } from './ActivityRow.tsx';
import { Link } from '@tanstack/react-router';
import { History, Play } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { useGameHistory } from '@/api/crossfire/useGameHistory.ts';
export function GameHistory({
  sessionId,
  embedded = false,
}: {
  sessionId: string;
  embedded?: boolean;
}) {
  const query = useGameHistory(sessionId);
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
      {query.isPending ? (
        <p role="status">Loading your games…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>Could not load your games.</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          {!query.data.pages[0]?.data.length && (
            <p className="text-sm text-muted-foreground">
              Your games will appear here when both players join. Open any game to review its
              history.
            </p>
          )}
          <div className="cf-game-list">
            {query.data.pages
              .flatMap(p => p.data)
              .map(game => (
                <ActivityRow key={game.gameId} leaders={game.leaders}>
                  <div>
                    <p className="font-medium">
                      {game.practice ? 'Practice · ' : ''}vs. {game.opponent}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(game.startedAt).toLocaleString()} ·{' '}
                      {game.status === 'abandoned'
                        ? 'Abandoned — incompatible version'
                        : game.exit?.status === 'pending'
                          ? 'Leaving…'
                          : game.result
                            ? `${game.result.winner === null ? 'Draw' : game.result.winner === game.mySeat ? 'Won' : 'Lost'} · Round ${game.round}`
                            : 'In progress'}
                      {game.exit?.status === 'forfeit' &&
                        ` · ${game.exit.seat === game.mySeat ? 'Match forfeited' : 'Opponent forfeited match'}`}
                      {game.compatible === false &&
                        game.status !== 'abandoned' &&
                        ' · Older version'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {game.status === 'running' && (
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/crossfire/$lobbyId" params={{ lobbyId: game.lobbyId }}>
                          Return to game
                        </Link>
                      </Button>
                    )}
                    {game.compatible !== false && game.status !== 'abandoned' ? (
                      <Button size="sm" variant="secondary" asChild>
                        <Link to="/crossfire/replay/$lobbyId" params={{ lobbyId: game.lobbyId }}>
                          <Play size={14} className="mr-2" />
                          Replay
                        </Link>
                      </Button>
                    ) : (
                      <span className="self-center text-xs text-muted-foreground">
                        Replay unavailable
                      </span>
                    )}
                  </div>
                </ActivityRow>
              ))}
          </div>
          {query.hasNextPage && (
            <Button
              variant="outline"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              Load earlier games
            </Button>
          )}
        </>
      )}
    </section>
  );
}
