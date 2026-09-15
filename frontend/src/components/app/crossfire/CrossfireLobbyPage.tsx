import { lazy, Suspense } from 'react';
import { Link, Navigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { useCrossfireLobby } from '@/api/crossfire/useCrossfireLobby.ts';
import type { ClientSession } from '@/lib/auth-client.ts';
import { CrossfireSession } from './CrossfireSession.tsx';
import { crossfireError } from './presentation.ts';
const GameBoard = lazy(() => import('./GameBoard.tsx'));

function Lobby({ session, lobbyId }: { session: ClientSession; lobbyId: string }) {
  const query = useCrossfireLobby(session.session.id, lobbyId);
  const lobby = query.data;
  if (query.isPending)
    return (
      <p role="status" className="p-8">
        Opening invitation…
      </p>
    );
  if (query.isError)
    return (
      <div className="space-y-4 p-8">
        <p role="alert">{crossfireError(query.error)}</p>
        <Button onClick={() => void query.refetch()}>Try again</Button>
        <Link to="/crossfire">Back to Crossfire</Link>
      </div>
    );
  if (!lobby) return null;
  if (lobby.status === 'started' && lobby.gameId && (lobby.mySeat || lobby.policy.allowSpectators))
    return (
      <Suspense
        fallback={
          <p role="status" className="p-8">
            Loading the game board…
          </p>
        }
      >
        <GameBoard key={lobby.gameId} lobby={lobby} sessionId={session.session.id} />
      </Suspense>
    );
  if (lobby.status === 'waiting' || lobby.status === 'expired' || lobby.status === 'cancelled')
    return <Navigate to="/crossfire" search={{ cfInvite: lobbyId }} replace />;
  return (
    <div className="p-8 space-y-4">
      <p>This game has two players and does not allow spectators.</p>
      <Link to="/crossfire">Back to Crossfire</Link>
    </div>
  );
}
export function CrossfireLobbyPage({ lobbyId }: { lobbyId: string }) {
  return (
    <CrossfireSession>
      {session => <Lobby key={lobbyId} session={session} lobbyId={lobbyId} />}
    </CrossfireSession>
  );
}
