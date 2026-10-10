import { z } from 'zod';

export const deckDetailTabSchema = z.enum(['decklist', 'charts', 'collection', 'article']);
export type DeckDetailTab = z.infer<typeof deckDetailTabSchema>;
export const deckDetailSearchSchema = z.object({
  deckTab: deckDetailTabSchema.optional().catch(undefined),
  deckArticleEdit: z.boolean().optional().catch(undefined),
  deckComment: z.guid().optional().catch(undefined),
});
