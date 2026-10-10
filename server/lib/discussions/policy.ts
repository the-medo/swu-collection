import type { SQL } from 'drizzle-orm';
import type { db } from '../../db';
import type { DiscussionComment } from '../../../shared/types/discussions.ts';
export type DiscussionTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DiscussionPolicy = {
  readable: SQL;
  moderator: SQL;
  // Lock the owning resource before the discussion, consistently with deletion.
  lockResource: (
    tx: DiscussionTransaction,
    discussionId: string,
    ownCommentId?: string,
  ) => Promise<{ canModerate: boolean } | undefined>;
  onCreated?: (
    tx: DiscussionTransaction,
    comment: DiscussionComment,
    parent?: DiscussionComment,
  ) => Promise<void>;
};
export type DiscussionResult<T> =
  | { data: T }
  | { error: string; status: 400 | 403 | 404 | 409 | 410 };
