import { z } from 'zod';
import { isPostEmpty, postDocumentSchemas, type PostDocument } from '../posts/content.ts';

export const MAX_COMMENT_BYTES = 16_000;
export const commentContentSchema = postDocumentSchemas.comments
  .refine(content => !isPostEmpty(content), 'Write a comment before posting.')
  .refine(
    content => new TextEncoder().encode(JSON.stringify(content)).length <= MAX_COMMENT_BYTES,
    'Comments must be smaller than 16 KB.',
  );
export const createCommentSchema = z
  .object({ content: commentContentSchema, parentId: z.guid().nullable().optional() })
  .strict();
export const updateCommentSchema = z
  .object({ content: commentContentSchema, revision: z.number().int().positive() })
  .strict();
const cursorSchema = z
  .object({
    id: z.guid(),
    createdAt: z
      .string()
      .max(60)
      .regex(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}(?::?\d{2})?)$/)
      .refine(
        value =>
          Number(value.slice(0, 4)) >= 1 &&
          z.iso.datetime({ offset: true }).safeParse(
            value
              .replace(' ', 'T')
              .replace(/([+-]\d{2})$/, '$1:00')
              .replace(/([+-]\d{2})(\d{2})$/, '$1:$2'),
          ).success,
        'Invalid comment cursor timestamp.',
      ),
  })
  .strict();
export type CommentCursor = z.infer<typeof cursorSchema>;
export const commentsQuerySchema = z.object({
  parentId: z.guid().optional(),
  cursor: z
    .string()
    .max(200)
    .transform((value, ctx) => {
      try {
        return cursorSchema.parse(JSON.parse(value));
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Invalid comment cursor.' });
        return z.NEVER;
      }
    })
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type DiscussionComment = {
  id: string;
  discussionId: string;
  parentId: string | null;
  depth: number;
  authorId: string | null;
  content: PostDocument;
  revision: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  replyCount: number;
  author: { id: string; displayName: string; image: string | null } | null;
  // Present only when the complete visible reply list is included in this response.
  replies?: DiscussionComment[];
};
export type CommentsPage = { data: DiscussionComment[]; total: number; nextCursor: string | null };
export type DiscussionInfo = { id: string; canModerate: boolean; total: number };
export type DiscussionThread = { path: DiscussionComment[] };
