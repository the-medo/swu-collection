import { z } from 'zod';
import { postDocumentSchemas } from '../posts/content.ts';
import type { PostDocument } from '../posts/content.ts';
export {
  MAX_COMMENT_BYTES as MAX_DECK_COMMENT_BYTES,
  commentContentSchema as deckCommentContentSchema,
  createCommentSchema as createDeckCommentSchema,
  updateCommentSchema as updateDeckCommentSchema,
  commentsQuerySchema as deckCommentsQuerySchema,
} from './discussions.ts';
export type {
  CommentCursor as DeckCommentCursor,
  DiscussionComment as DeckComment,
  CommentsPage as DeckCommentsPage,
} from './discussions.ts';
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
