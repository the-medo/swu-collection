import { ActivityRow } from './ActivityRow.tsx';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { usePractice, useDeclinePractice } from '@/api/crossfire/usePractice.ts';
export function PracticeInvitations({
  sessionId,
  embedded = false,
}: {
  sessionId: string;
  embedded?: boolean;
}) {
  const query = usePractice(sessionId),
    decline = useDeclinePractice(sessionId);
  if (!embedded && !query.data?.length && !query.isError) return null;
  return (
    <section
      className={
        embedded ? 'cf-activity-panel space-y-4' : 'space-y-4 rounded-xl border bg-card p-5'
      }
      aria-labelledby="cf-practice-title"
    >
      <h2 className={embedded ? 'sr-only' : 'text-xl font-semibold'} id="cf-practice-title">
        Practice invitations
      </h2>
      {query.isPending && <p role="status">Loading invitations…</p>}
      {!query.isPending && !query.isError && !query.data?.length && (
        <p className="text-sm text-muted-foreground">
          No practice invitations yet. Use a saved position to invite your opponent to play from
          there.
        </p>
      )}
      {(query.isError || decline.isError) && (
        <p role="alert">Could not update practice invitations.</p>
      )}
      <div className="cf-game-list">
        {query.data?.map(request => (
          <ActivityRow key={request.id} leaders={request.leaders}>
            <div>
              <p>{request.label || 'Saved position'}</p>
              <p className="text-sm text-muted-foreground">
                {request.status === 'accepted'
                  ? 'Ready to play'
                  : request.mine
                    ? 'Waiting for your opponent'
                    : 'Your opponent invited you to practice'}
              </p>
            </div>
            {request.createdLobbyId ? (
              <Button asChild size="sm">
                <Link to="/crossfire/$lobbyId" params={{ lobbyId: request.createdLobbyId }}>
                  Enter practice game
                </Link>
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link
                    to="/crossfire/replay/$lobbyId"
                    params={{ lobbyId: request.lobbyId }}
                    search={{
                      cfPosition: request.position,
                      cfBranch: request.branch,
                      cfPractice: request.id,
                    }}
                  >
                    {request.mine ? 'View invitation' : 'Review invitation'}
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={decline.isPending}
                  onClick={() => decline.mutate(request.id)}
                >
                  {request.mine ? 'Cancel invitation' : 'Decline'}
                </Button>
              </div>
            )}
          </ActivityRow>
        ))}
      </div>
    </section>
  );
}
