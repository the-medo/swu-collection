import { crossfireHomeStyles as styles } from './crossfireHomeStyles.ts';
import { LeaveGameButton } from './LeaveGameButton.tsx';
import { ActivityRow } from './ActivityRow.tsx';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Swords } from 'lucide-react';
import { useGameHistory } from '@/api/crossfire/useGameHistory.ts';
import { Button } from '@/components/ui/button.tsx';
import { ReplayButton } from './ReplayButton.tsx';

export function RunningGames({ sessionId }: { sessionId: string }) {
  const query = useGameHistory(sessionId, 'running');
  const games = query.data?.pages.flatMap(page => page.data) ?? [];
  return (
    <section className={`${styles.panel} cf-running-games`} aria-labelledby="cf-running-title">
      <div className="mb-4 flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-primary" />
        <h2 className={styles.heading} id="cf-running-title">
          Games in progress
        </h2>
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
        <div className="cf-running-list grid max-h-96 gap-3 overflow-y-auto">
          {games.map(game => (
            <ActivityRow key={game.gameId} leaders={game.leaders} bases={game.bases}>
              <div>
                <p className="text-xs font-semibold wrap-anywhere">vs. {game.opponent}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
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
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                <Button
                  asChild
                  size="sm"
                  className="cf-resume-button h-7 gap-1 px-2 text-xs"
                  aria-label={`Return to game against ${game.opponent}`}
                >
                  <Link to="/crossfire/$lobbyId" params={{ lobbyId: game.lobbyId }}>
                    Return
                    <ArrowRight size={16} />
                  </Link>
                </Button>
                {game.compatible !== false && <ReplayButton lobbyId={game.lobbyId} />}
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
        <div className={`${styles.empty} cf-no-running`}>
          <Swords size={22} className="text-primary" />
          <p className="font-medium text-foreground">Ready for your next matchup?</p>
          <p>Games in progress appear here, so you can return whenever you’re ready.</p>
        </div>
      )}
    </section>
  );
}
