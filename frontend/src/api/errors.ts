import type { ErrorWithStatus } from '../../../types/ErrorWithStatus.ts';

type ApiErrorBody = {
  message?: string;
  error?: string;
};

export async function createApiError(response: Response, fallbackMessage: string) {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  const message = body?.message ?? body?.error ?? response.statusText ?? fallbackMessage;
  const error = new Error(message) as Error & ErrorWithStatus;
  error.status = response.status;
  return error;
}
