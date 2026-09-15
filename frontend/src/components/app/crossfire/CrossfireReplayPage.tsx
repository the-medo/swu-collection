import { lazy, Suspense } from 'react';
import { Link } from '@tanstack/react-router';
import { useCrossfireLobby } from '@/api/crossfire/useCrossfireLobby.ts';
import type { ClientSession } from '@/lib/auth-client.ts';
import { Button } from '@/components/ui/button.tsx';
import { CrossfireSession } from './CrossfireSession.tsx';
const ReplayBoard = lazy(() => import('./ReplayBoard.tsx'));
type Props = { lobbyId: string; position?: string; branch?: string; practice?: string };
function Replay({
  session,
  lobbyId,
  position,
  branch,
  practice,
}: Props & { session: ClientSession }) {
  const query = useCrossfireLobby(session.session.id, lobbyId);
  if (query.isPending)
    return (
      <p role="status" className="p-8">
        Opening replay…
      </p>
    );
  const lobby = query.data;
  if (query.isError || !lobby?.gameId || !(lobby.mySeat || lobby.policy.allowSpectators))
    return (
      <div className="space-y-4 p-8">
        <p role="alert">This replay is unavailable to your account.</p>
        <Button variant="outline" asChild>
          <Link to="/crossfire">Back to Crossfire</Link>
        </Button>
      </div>
    );
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8">
          Loading replay board…
        </p>
      }
    >
      <ReplayBoard
        lobby={lobby}
        initialPosition={position}
        initialBranch={branch}
        practiceRequest={practice}
      />
    </Suspense>
  );
}
export function CrossfireReplayPage(props: Props) {
  return <CrossfireSession>{session => <Replay {...props} session={session} />}</CrossfireSession>;
}
