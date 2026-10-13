import { expect, test } from 'bun:test';
import { DeckBuilderError } from '../../decks/deckBuilders.ts';
import { ProfanityError } from '../../moderation/content.ts';
import { WorkerError, MAX_ATTEMPTS, MAX_VIDEO_WAIT_MS, MAX_PROVIDER_WAIT_MS } from './contracts.ts';
import { deckDisposition, failureDisposition } from './policy.ts';

test('invalid decks are skipped, transient failures resume, and lost claims always abort', () => {
  for (const [error, code] of [
    [new ProfanityError('name', 'Deck name'), 'deck_text_rejected'],
    [new DeckBuilderError('missing', 404), 'deck_not_found'],
    [new DeckBuilderError('private', 400, 'unavailable'), 'deck_not_available'],
    [new DeckBuilderError('bad data', 502, 'invalid-data'), 'deck_invalid_payload'],
    [new WorkerError('deck_removed_or_not_public', false), 'deck_removed_or_not_public'],
  ] as const)
    expect(deckDisposition(error, 1)).toEqual({ action: 'skip', code });
  expect(deckDisposition(new Error('timeout'), 1).action).toBe('retry');
  expect(deckDisposition(new Error('timeout'), MAX_ATTEMPTS)).toEqual({
    action: 'skip',
    code: 'deck_provider_failed_after_retries',
  });
  const lostClaim = new WorkerError('job_claim_lost', false);
  expect(deckDisposition(lostClaim, MAX_ATTEMPTS)).toEqual({ action: 'retry', error: lostClaim });
});

test('queue outcomes bound provider waits and spending without exhausting scheduled videos', () => {
  const now = Date.parse('2026-10-13T12:00:00Z');
  const job = { createdAt: new Date(now).toISOString(), attempts: 1 };
  const decide = (error: WorkerError, age = 0) =>
    failureDisposition({ ...job, createdAt: new Date(now - age).toISOString() }, error, now);
  expect(decide(new WorkerError('budget_exhausted', false))).toMatchObject({
    action: 'wait',
    stopBatch: true,
    budgetStopped: true,
    count: null,
    update: { status: 'pending', attempts: 0 },
  });
  expect(decide(new WorkerError('video_not_ready'))).toMatchObject({
    action: 'wait',
    stopBatch: false,
    count: 'waiting',
    update: { attempts: 0 },
  });
  expect(decide(new WorkerError('video_not_ready'), MAX_VIDEO_WAIT_MS)).toMatchObject({
    action: 'skip',
    count: 'skipped',
    update: { status: 'skipped', lastError: 'video_wait_expired' },
  });
  expect(decide(new WorkerError('gemini_http_429'))).toMatchObject({
    action: 'wait',
    stopBatch: true,
    update: { status: 'pending', attempts: 0 },
  });
  expect(decide(new WorkerError('gemini_http_403', false), MAX_PROVIDER_WAIT_MS)).toMatchObject({
    action: 'fail',
    stopBatch: true,
    update: { status: 'failed', attempts: MAX_ATTEMPTS },
  });
  // Google can report invalid-key/billing/shared-schema errors as HTTP 400.
  expect(decide(new WorkerError('gemini_http_400', false))).toMatchObject({
    action: 'wait',
    stopBatch: true,
    update: { status: 'pending', attempts: 0 },
  });
  expect(decide(new WorkerError('gemini_http_413', false))).toMatchObject({
    action: 'fail',
    stopBatch: false,
    update: { status: 'failed', attempts: MAX_ATTEMPTS },
  });
  expect(decide(new WorkerError('gemini_request_failed'))).toMatchObject({
    action: 'retry',
    stopBatch: true,
    update: { attempts: 1 },
  });
  expect(decide(new WorkerError('deck_provider_failed'))).toMatchObject({
    action: 'retry',
    stopBatch: false,
  });
  expect(decide(new WorkerError('job_claim_lost', false))).toMatchObject({
    action: 'fail',
    update: { attempts: MAX_ATTEMPTS },
  });
});
