import { LeaveGameButton } from './LeaveGameButton.tsx';
import { ActivityRow } from './ActivityRow.tsx';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Swords } from 'lucide-react';
import { useGameHistory } from '@/api/crossfire/useGameHistory.ts';
import { Button } from '@/components/ui/button.tsx';

export function RunningGames({ sessionId }: { sessionId: string }) {
  const query = useGameHistory(sessionId, 'running');
  const games = query.data?.pages.flatMap(page => page.data) ?? [];
  return (
    <section className="cf-home-card cf-running-games" aria-labelledby="cf-running-title">
      <div className="cf-resume-label">
        <span />
        <h2 id="cf-running-title">Games in progress</h2>
      </div>
      {query.isPending ? (
        <p role="status">Loading games…</p>
      ) : query.isError && !games.length ? (
        <div role="alert">
          <p>Could not load your games.</p>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      ) : games.length ? (
        <div className="cf-running-list">
          {games.map(game => (
            <ActivityRow key={game.gameId} leaders={game.leaders}>
              <div>
                <p className="cf-resume-opponent">vs. {game.opponent}</p>
                <p className="cf-resume-meta">
                  {game.exit?.status === 'pending'
                    ? 'Leaving… · '
                    : game.compatible === false
                      ? 'Older version · '
                      : ''}
                  {game.practice ? 'Practice · ' : ''}
                  {game.round ? `Round ${game.round} · ` : ''}
                  {new Date(game.startedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  asChild
                  size="sm"
                  className="cf-resume-button"
                  aria-label={`Return to game against ${game.opponent}`}
                >
                  <Link to="/crossfire/$lobbyId" params={{ lobbyId: game.lobbyId }}>
                    Return
                    <ArrowRight size={16} />
                  </Link>
                </Button>
                <LeaveGameButton
                  sessionId={sessionId}
                  lobbyId={game.lobbyId}
                  bestOf={game.bestOf}
                  compatible={game.compatible}
                  exit={game.exit}
                  compact
                />
              </div>
            </ActivityRow>
          ))}
          {query.isError && <p role="alert">Could not load more games.</p>}
          {query.hasNextPage && (
            <Button
              variant="ghost"
              size="sm"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              More running games
            </Button>
          )}
        </div>
      ) : (
        <div className="cf-no-running">
          <Swords size={28} />
          <p>No game in progress.</p>
          <small>Your next game will wait here if you step away.</small>
        </div>
      )}
    </section>
  );
}
