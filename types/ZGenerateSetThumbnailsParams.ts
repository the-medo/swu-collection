import { z } from 'zod';
import { SwuSet } from './enums.ts';

export const zGenerateSetThumbnailsParams = z.object({
  set: z.nativeEnum(SwuSet).optional(),
});

export type ZGenerateSetThumbnailsParams = z.infer<typeof zGenerateSetThumbnailsParams>;