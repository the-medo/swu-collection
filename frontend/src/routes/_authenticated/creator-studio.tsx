import { createFileRoute, Outlet } from '@tanstack/react-router';
import { z } from 'zod';
import { creatorStudioQuerySchema } from '../../../../shared/creators/contracts.ts';
export const Route = createFileRoute('/_authenticated/creator-studio')({
  validateSearch: z.object({
    creatorId: z.uuid().optional().catch(undefined),
    page: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
    q: creatorStudioQuerySchema.shape.q.catch(undefined),
    status: creatorStudioQuerySchema.shape.status.catch(undefined),
    creationId: z.uuid().optional().catch(undefined),
    youtube: z.enum(['connected', 'failed', 'claimed', 'confirm']).optional().catch(undefined),
    youtubeClaimId: z
      .string()
      .regex(/^[\w-]{43}$/)
      .optional()
      .catch(undefined),
    youtubeError: z.enum(['already_claimed', 'channel_mismatch']).optional().catch(undefined),
    transferredDecks: z.coerce.number().int().min(0).optional().catch(undefined),
    youtubeChannelId: z
      .string()
      .regex(/^UC[\w-]{22}$/)
      .optional()
      .catch(undefined),
  }),
  component: Outlet,
});
