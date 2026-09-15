import { z } from 'zod';

export const crossfireDeckBrowserQuery = z.strictObject({
  source: z.enum(['recent', 'mine', 'public']),
  search: z.string().trim().max(120).default(''),
  cursor: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .max(256)
    .optional(),
});
export type CrossfireDeckSource = z.infer<typeof crossfireDeckBrowserQuery>['source'];
export type CrossfireDeckBrowserQuery = z.infer<typeof crossfireDeckBrowserQuery>;

/** Current deck metadata only. Frozen decks and game state never enter this DTO. */
export type CrossfireDeckSummary = {
  id: string;
  name: string;
  leaderId: string | null;
  baseId: string | null;
  author: string;
};
export type CrossfireDeckPage = {
  data: CrossfireDeckSummary[];
  nextCursor: string | null;
};
