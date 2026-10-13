import { DeckBuilderError } from '../../decks/deckBuilders.ts';
import { ProfanityError } from '../../moderation/content.ts';
import {
  WorkerError,
  MAX_ATTEMPTS,
  MAX_VIDEO_WAIT_MS,
  MAX_PROVIDER_WAIT_MS,
  isRejectedGeminiRequest,
  type DeckIssueCode,
} from './contracts.ts';

export type DeckDisposition =
  | { action: 'skip'; code: DeckIssueCode }
  | { action: 'retry'; error: WorkerError };

/** One bad deck must not prevent publication of an otherwise valid video. */
export function deckDisposition(error: unknown, attempts: number): DeckDisposition {
  if (error instanceof ProfanityError) return { action: 'skip', code: 'deck_text_rejected' };
  if (error instanceof WorkerError) {
    if (
      error.code === 'deck_incomplete_or_unknown_cards' ||
      error.code === 'deck_removed_or_not_public'
    )
      return { action: 'skip', code: error.code };
    return { action: 'retry', error };
  }
  if (error instanceof DeckBuilderError) {
    if (error.status === 404) return { action: 'skip', code: 'deck_not_found' };
    if (error.reason === 'unavailable') return { action: 'skip', code: 'deck_not_available' };
    if (error.reason === 'invalid-data') return { action: 'skip', code: 'deck_invalid_payload' };
  }
  return attempts >= MAX_ATTEMPTS
    ? { action: 'skip', code: 'deck_provider_failed_after_retries' }
    : { action: 'retry', error: new WorkerError('deck_provider_failed') };
}

/** Queue scheduling and batch accounting share the same decision. */
export function failureDisposition(
  job: { createdAt: string; attempts: number },
  error: WorkerError,
  now = Date.now(),
) {
  const budget = error.code === 'budget_exhausted';
  const video = error.code === 'video_not_ready';
  const paused = error.code === 'auto_import_paused';
  // A 400 can reject the API key, billing or shared request schema. Preserve
  // the queue for a configuration fix; only an explicit size rejection is local.
  const payloadTooLarge = error.code === 'gemini_http_413';
  const retryable = error.retryable && !payloadTooLarge;
  const rejected = isRejectedGeminiRequest(error.code) && !payloadTooLarge;
  const waiting = budget || video || rejected || paused;
  const age = now - Date.parse(job.createdAt);
  const expired = video && age >= MAX_VIDEO_WAIT_MS;
  const providerExpired = rejected && age >= MAX_PROVIDER_WAIT_MS;
  const status = expired ? 'skipped' : providerExpired ? 'failed' : waiting ? 'pending' : 'failed';
  return {
    action: expired
      ? 'skip'
      : providerExpired || (!waiting && (!retryable || job.attempts >= MAX_ATTEMPTS))
        ? 'fail'
        : waiting
          ? 'wait'
          : 'retry',
    stopBatch: budget || (error.code.startsWith('gemini_') && !payloadTooLarge),
    budgetStopped: budget,
    count: budget ? null : expired ? 'skipped' : video || paused ? 'waiting' : 'failed',
    update: {
      status,
      attempts: providerExpired
        ? MAX_ATTEMPTS
        : waiting
          ? Math.max(0, job.attempts - 1)
          : retryable
            ? job.attempts
            : MAX_ATTEMPTS,
      availableAt: new Date(
        now + (paused ? 0 : waiting ? 60 * 60_000 : Math.min(60, 5 * 2 ** job.attempts) * 60_000),
      ).toISOString(),
      lastError: expired ? 'video_wait_expired' : error.code,
    },
  } as const;
}
