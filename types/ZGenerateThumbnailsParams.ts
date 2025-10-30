import { z } from 'zod';

export const zGenerateThumbnailsParams = z.object({
  force: z.preprocess(
    // Convert string "false" to boolean false
    val => {
      if (val === 'false') return false;
      if (val === 'true') return true;
      return val;
    },
    z.boolean().optional().default(false),
  ),
  tournament_id: z.guid().optional(),
});

export type ZGenerateThumbnailsParams = z.infer<typeof zGenerateThumbnailsParams>;
