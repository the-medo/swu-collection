import { z } from 'zod';

export type { VideoMetadata } from '../video.ts';
export const classificationSchema = z.object({
  relevance: z.enum(['primary', 'partial', 'unrelated', 'uncertain']),
  confidence: z.number().min(0).max(1),
  // A short exact excerpt allows local validation of the model's evidence.
  evidence: z.string().max(400),
  reason: z.string().max(500),
  language: z.string().max(35),
  tags: z.array(z.object({ id: z.string(), confidence: z.number().min(0).max(1) })).max(30),
  leaders: z.array(z.object({ id: z.string(), evidence: z.string().max(200) })).max(10),
  sets: z.array(z.object({ id: z.string(), evidence: z.string().max(200) })).max(10),
});
export type Classification = z.infer<typeof classificationSchema>;
export type Analysis = Classification & { version: number; metadataHash: string };
export type DeckIssueCode =
  | 'deck_not_found'
  | 'deck_not_available'
  | 'deck_invalid_payload'
  | 'deck_text_rejected'
  | 'deck_incomplete_or_unknown_cards'
  | 'deck_removed_or_not_public'
  | 'deck_provider_failed_after_retries';
export type WorkerIssue = {
  code:
    | DeckIssueCode
    | 'deck_link_limit_reached'
    | 'deck_format_defaulted_to_premier'
    | 'deck_link_pending_review'
    | 'deck_changed_before_publication'
    | 'video_text_rejected';
  source?: string;
  sourceDeckId?: string;
  url?: string;
  deckId?: string;
};
export type JobStatus = 'pending' | 'processing' | 'published' | 'review' | 'skipped' | 'failed';
export type TokenUsage = { input: number; output: number; thinking: number };

/** Only these fixed error categories may reach logs, the queue or Sentry. */
export type WorkerCode =
  | `${'youtube' | 'gemini'}_http_${number}`
  | `${'youtube' | 'gemini'}_request_failed`
  | 'youtube_key_missing'
  | 'gemini_key_missing'
  | 'gemini_invalid_response'
  | 'gemini_invalid_classification'
  | 'metadata_request_too_large'
  | 'video_not_ready'
  | 'job_claim_lost'
  | 'budget_exhausted'
  | 'channel_no_longer_eligible'
  | 'auto_import_paused'
  | 'video_belongs_to_another_creator'
  | 'video_channel_mismatch'
  | 'creator_missing'
  | 'deck_incomplete_or_unknown_cards'
  | 'deck_removed_or_not_public'
  | 'deck_provider_failed'
  | 'invalid_creator_budget'
  | 'invalid_discovery_date'
  | 'invalid_worker_limit'
  | 'invalid_video_id'
  | 'invalid_worker_arguments'
  | 'invalid_worker_command'
  | 'invalid_status_filter'
  | 'video_id_required'
  | 'inventory_file_required'
  | 'inventory_too_large'
  | 'creator_video_batch_failed'
  | 'creator_video_discovery_incomplete'
  | 'creator_youtube_maintenance_failed'
  | 'creator_worker_failed';
export class WorkerError extends Error {
  constructor(
    public readonly code: WorkerCode,
    public readonly retryable = true,
  ) {
    super(code);
    this.name = 'CreatorWorkerError';
  }
}
export const errorCode = (error: unknown) =>
  error instanceof WorkerError ? error.code : 'creator_worker_failed';

export const MODEL = 'gemini-3.5-flash-lite';
export const ANALYSIS_VERSION = 2;
export const MAX_ATTEMPTS = 3;
export const MAX_VIDEO_WAIT_MS = 30 * 86400_000;
export const MAX_PROVIDER_WAIT_MS = 7 * 86400_000;
export const isRejectedGeminiRequest = (code: string) => /^gemini_http_4\d\d$/.test(code);
export const MAX_DECK_LINKS = 10;
export const RESERVATION_MICROS = 50_000; // $0.05; bounds a <=64KiB text request + 4096 output tokens.
export const MAX_REQUEST_BYTES = 65_536;
export const MAX_OUTPUT_TOKENS = 4096;
export const costMicros = ({ input, output, thinking }: TokenUsage) =>
  Math.ceil(input * 0.3 + (output + thinking) * 2.5);

export function budgetMicros(value = process.env.CREATOR_GEMINI_BUDGET_USD ?? '5') {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) > 40)
    throw new WorkerError('invalid_creator_budget', false);
  return Math.round(Number(value) * 1_000_000);
}
