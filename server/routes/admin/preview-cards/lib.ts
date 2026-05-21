import { z } from 'zod';
import type { InferSelectModel } from 'drizzle-orm';
import { previewCard } from '../../../db/schema/preview_card.ts';
import {
  normalizePreviewCardPayload,
  zPreviewCardStatus,
} from '../../../lib/cards/previewCardPayload.ts';
import type {
  PreviewCardPayload,
  PreviewCardStatus,
} from '../../../lib/cards/previewCardPayload.ts';

type PreviewCardRow = InferSelectModel<typeof previewCard>;

export const zPreviewCardCreateBody = z.object({
  cardId: z.string().optional(),
  status: zPreviewCardStatus.default('active'),
  officialCardId: z.string().nullable().optional(),
  payload: z.unknown(),
});

export const zPreviewCardUpdateBody = z.object({
  cardId: z.string().optional(),
  status: zPreviewCardStatus.optional(),
  officialCardId: z.string().nullable().optional(),
  payload: z.unknown().optional(),
});

export const zPreviewCardMigrateBody = z.object({
  officialCardId: z.string().min(1),
});

export type PreviewCardCreateBody = z.infer<typeof zPreviewCardCreateBody>;
export type PreviewCardUpdateBody = z.infer<typeof zPreviewCardUpdateBody>;

export type AdminPreviewCardRow = {
  id: string;
  cardId: string;
  status: PreviewCardStatus;
  officialCardId: string | null;
  payload: PreviewCardPayload;
  createdAt: string;
  updatedAt: string;
  validationError: string | null;
};

export function formatPreviewCardPayloadError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .map(issue => `${issue.path.length ? issue.path.join('.') : 'payload'}: ${issue.message}`)
      .join('\n');
  }

  return error instanceof Error ? error.message : String(error);
}

export function normalizePreviewCardCreateInput(body: PreviewCardCreateBody) {
  const payload = normalizePreviewCardPayload(body.payload);
  const cardId = body.cardId?.trim() || payload.cardId;

  if (!cardId) {
    throw new Error('cardId is required when payload.name is blank');
  }

  const normalizedPayload: PreviewCardPayload = {
    ...payload,
    cardId,
    preview: true,
    previewStatus: 'active',
  };

  return {
    cardId,
    status: body.status,
    officialCardId: body.officialCardId?.trim() || null,
    payload: normalizedPayload,
  };
}

export function normalizePreviewCardUpdateInput(body: PreviewCardUpdateBody) {
  const updates: {
    cardId?: string;
    status?: PreviewCardStatus;
    officialCardId?: string | null;
    payload?: PreviewCardPayload;
    updatedAt: string;
  } = {
    updatedAt: new Date().toISOString(),
  };

  if (body.payload !== undefined) {
    const payload = normalizePreviewCardPayload(body.payload);
    const cardId = body.cardId?.trim() || payload.cardId;

    if (!cardId) {
      throw new Error('cardId is required when payload.name is blank');
    }

    updates.cardId = cardId;
    updates.payload = {
      ...payload,
      cardId,
      preview: true,
      previewStatus: 'active',
    } satisfies PreviewCardPayload;
  } else if (body.cardId !== undefined) {
    const cardId = body.cardId.trim();
    if (cardId) updates.cardId = cardId;
  }

  if (body.status !== undefined) {
    updates.status = body.status;
  }

  if (body.officialCardId !== undefined) {
    updates.officialCardId = body.officialCardId?.trim() || null;
  }

  return updates;
}

export function toAdminPreviewCardRow(row: PreviewCardRow): AdminPreviewCardRow {
  let validationError: string | null = null;

  try {
    normalizePreviewCardPayload(row.payload);
  } catch (error) {
    validationError = formatPreviewCardPayloadError(error);
  }

  return {
    id: row.id,
    cardId: row.cardId,
    status: row.status,
    officialCardId: row.officialCardId,
    payload: row.payload,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    validationError,
  };
}
