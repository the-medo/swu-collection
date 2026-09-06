import type { ErrorWithStatus } from '../../../types/ErrorWithStatus.ts';

type ApiErrorBody = {
  message?: unknown;
  error?: unknown;
};

export async function createApiError(response: Response, fallbackMessage: string) {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  const bodyMessage = [body?.message, body?.error].find(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
  const message = bodyMessage || response.statusText || fallbackMessage;
  const error = new Error(message) as Error & ErrorWithStatus;
  error.status = response.status;
  return error;
}
