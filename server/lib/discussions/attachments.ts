import { and, eq, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db';
import { discussion } from '../../db/schema/discussion.ts';
import type { DiscussionType } from '../../../shared/types/discussions.ts';
import type { DiscussionPolicy } from './policy.ts';
import { deckDiscussionAttachment } from '../decks/discussionAttachment.ts';

export type DiscussionAttachment = {
  findDiscussionId: (resourceId: string) => Promise<string | undefined>;
  readable: (viewerId?: string | SQL) => SQL;
  policy: (viewerId?: string) => DiscussionPolicy;
  notificationTarget: {
    name: SQL<string | null>;
    url: (commentId: SQL) => SQL<string | null>;
    // Compatibility for notification responses consumed by already-open clients.
    legacyDeckId?: SQL<string | null>;
  };
};

// The single registration point for resource integrations. The comment service,
// HTTP handlers and UI do not import individual resource implementations.
const attachments: ReadonlyMap<string, DiscussionAttachment> = new Map(
  Object.entries({ deck: deckDiscussionAttachment } satisfies Record<
    DiscussionType,
    DiscussionAttachment
  >),
);
export function getDiscussionAttachment(type: string): DiscussionAttachment | undefined {
  return attachments.get(type);
}
export function discussionAttachmentEntries() {
  return [...attachments];
}

export async function resolveDiscussionPolicy(
  id: string,
  viewerId?: string,
): Promise<DiscussionPolicy> {
  const [row] = await db
    .select({ type: discussion.type })
    .from(discussion)
    .where(eq(discussion.id, id));
  const attachment = row && getDiscussionAttachment(row.type);
  if (!attachment)
    return {
      readable: sql`false`,
      moderator: sql`false`,
      lockResource: async () => undefined,
    };
  const policy = attachment.policy(viewerId);
  return {
    ...policy,
    type: row.type,
    readable: and(eq(discussion.type, row.type), policy.readable)!,
    moderator: and(eq(discussion.type, row.type), policy.moderator)!,
  };
}
