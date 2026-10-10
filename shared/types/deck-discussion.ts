import { z } from 'zod';
import { postDocumentSchemas } from '../posts/content.ts';
import type { PostDocument } from '../posts/content.ts';
export const saveDeckArticleSchema = z
  .object({ content: postDocumentSchemas.rich, revision: z.number().int().positive().nullable() })
  .strict();
export type DeckArticle = {
  deckId: string;
  content: PostDocument;
  revision: number;
  createdAt: string;
  updatedAt: string;
};
