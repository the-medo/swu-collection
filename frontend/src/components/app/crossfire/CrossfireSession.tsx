import './crossfire.css';
import { Link } from '@tanstack/react-router';
import { hasCrossfireAccess } from '../../../../../shared/lib/auth/roles.ts';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession, type ClientSession } from '@/lib/auth-client.ts';
import { crossfireKeys } from '@/api/crossfire/queryKeys.ts';

function Session({
  session,
  children,
}: {
  session: ClientSession;
  children: (session: ClientSession) => ReactNode;
}) {
  const client = useQueryClient();
  const id = session.session.id;
  useEffect(
    () => () => {
      client.removeQueries({ queryKey: crossfireKeys.session(id) });
    },
    [client, id],
  );
  return children(session);
}
// Changing or losing the signed-in session unmounts the complete game subtree.
export function CrossfireSession({
  children,
}: {
  children: (session: ClientSession) => ReactNode;
}) {
  const { data, isPending } = useSession();
  if (!data || isPending) return <p role="status">Loading your session…</p>;
  if (!hasCrossfireAccess(data.user.role))
    return (
      <div className="flex flex-col gap-3 p-4">
        <h1 className="text-xl font-semibold">Crossfire access required</h1>
        <p>Your account needs the Crossfire role to play or spectate.</p>
        <Link to="/" className="text-primary underline">
          Return home
        </Link>
      </div>
    );
  return (
    <Session key={data.session.id} session={data}>
      {children}
    </Session>
  );
}
