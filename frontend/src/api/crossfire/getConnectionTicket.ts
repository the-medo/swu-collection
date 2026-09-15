import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';
// Single-use credentials are never put in a Query or mutation cache.
export async function getConnectionTicket(
  lobbyId: string,
  role: 'player' | 'spectator',
  signal: AbortSignal,
  purpose: 'live' | 'replay' = 'live',
) {
  const response = await api.crossfire.lobbies[':lobbyId'].tickets.$post(
    { param: { lobbyId }, json: { role, purpose } },
    { init: { signal } },
  );
  if (!response.ok) throw await createApiError(response, 'Could not connect to this game');
  return (await response.json()).data;
}
