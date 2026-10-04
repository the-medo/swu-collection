import { api } from '@/lib/api.ts';
import { createApiError } from '@/api/errors.ts';

export async function fetchUserFiles(page: number, signal: AbortSignal) {
  const response = await api['user-files'].$get(
    { query: { page: String(page) } },
    { init: { signal } },
  );
  if (!response.ok) throw await createApiError(response, 'Could not load your images.');
  return (await response.json()).data;
}
