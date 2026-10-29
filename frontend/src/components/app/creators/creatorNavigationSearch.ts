import { z } from 'zod';
import { discoverySchema } from '../../../../../shared/creators/contracts.ts';

// Only public browsing destinations belong in a return link. In particular, a
// copied URL must never redirect a reader to another origin or a private page.
export const creatorReturnToSchema = z
  .string()
  .max(4000)
  .refine(value => {
    if (!value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return false;
    const path = value.split(/[?#]/)[0];
    return /^\/(content\/?|creators\/?|creators\/[a-z0-9-]+(?:\/(videos|articles|podcasts|decks|series|about))?\/?)$/.test(
      path,
    );
  })
  .optional()
  .catch(undefined);

export const creatorDirectorySearchSchema = z.object({
  // Restore the query text from copied URLs; the API normalizes submitted searches.
  q: z.string().max(120).optional().catch(undefined),
  language: discoverySchema.shape.language.catch(undefined),
  tags: discoverySchema.shape.tags.catch(undefined),
  page: discoverySchema.shape.page.catch(1),
});
export type CreatorDirectorySearch = z.infer<typeof creatorDirectorySearchSchema>;
