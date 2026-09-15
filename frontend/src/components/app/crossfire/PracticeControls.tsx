import { useStore } from '@tanstack/react-store';
import { useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button.tsx';
import { useSession } from '@/lib/auth-client.ts';
import { usePractice, practiceKey } from '@/api/crossfire/usePractice.ts';
import type { CrossfireConnection } from './connection.ts';
export function PracticeControls({
  connection,
  requestId,
}: {
  connection: CrossfireConnection;
  requestId: string;
}) {
  const { data: session } = useSession();
  return session ? (
    <Controls sessionId={session.session.id} connection={connection} requestId={requestId} />
  ) : null;
}
function Controls({
  connection,
  requestId,
  sessionId,
}: {
  connection: CrossfireConnection;
  requestId: string;
  sessionId: string;
}) {
  const query = usePractice(sessionId),
    state = useStore(connection.store),
    client = useQueryClient();
  const request = query.data?.find(r => r.id === requestId);
  const created =
    state.practice?.id === requestId ? state.practice.lobbyId : request?.createdLobbyId;
  useEffect(() => {
    if (state.practice) void client.invalidateQueries({ queryKey: practiceKey(sessionId) });
  }, [state.practice, client, sessionId]);
  const atPosition =
    state.replay?.position === request?.position && state.replay?.branch === request?.branch;
  return (
    <aside
      className="cf-notice flex flex-wrap items-center justify-between gap-3"
      aria-label="Practice invitation"
    >
      <p>
        {created
          ? 'Your practice game is ready.'
          : request
            ? `Practice from “${request.label || 'Saved position'}”. Both players keep their original seats. This uses the exact hidden cards and deck order; the source game stays unchanged.`
            : 'This practice invitation is unavailable.'}
      </p>
      {created ? (
        <Button asChild size="sm">
          <Link to="/crossfire/$lobbyId" params={{ lobbyId: created }}>
            Enter practice game
          </Link>
        </Button>
      ) : request && !request.mine ? (
        <Button
          size="sm"
          disabled={state.status !== 'connected' || state.pending || state.practicePending}
          onClick={() =>
            atPosition
              ? connection.acceptPractice(requestId)
              : connection.seek({
                  kind: 'position',
                  position: request.position,
                  branch: request.branch,
                })
          }
        >
          {state.practicePending
            ? 'Creating…'
            : atPosition
              ? 'Accept and create practice game'
              : 'Show requested position'}
        </Button>
      ) : request ? (
        <span>Waiting for your opponent’s approval</span>
      ) : null}
    </aside>
  );
}
