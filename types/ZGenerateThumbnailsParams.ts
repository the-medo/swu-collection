import { z } from 'zod';
import { booleanPreprocessor } from '../shared/lib/zod/booleanPreprocessor.ts';

export const zGenerateThumbnailsParams = z.object({
  force: booleanPreprocessor.optional().default(false),
  tournament_id: z.guid().optional(),
});

export type ZGenerateThumbnailsParams = z.infer<typeof zGenerateThumbnailsParams>;
