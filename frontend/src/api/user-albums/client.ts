import { createApiError } from '@/api/errors.ts';

export async function albumData<T>(response: Response): Promise<T> {
  if (!response.ok) throw await createApiError(response, 'Could not load this album.');
  return (await response.json()).data;
}

export function albumAccessLost(error: Error | null) {
  return !!error && 'status' in error && [401, 403, 404].includes(Number(error.status));
}
