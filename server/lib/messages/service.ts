import { and, desc, eq, gt, lt, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { HTTPException } from 'hono/http-exception';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { directConversation as c, directMessage as m } from '../../db/schema/direct_message.ts';
import { notifyMessageChanged } from './publish.ts';
import type {
  ConversationCursor,
  ConversationPage,
  DirectMessage,
  MessagePage,
  MessageUpdate,
} from '../../../shared/types/messages.ts';

const messagePageSize = 30;
const participant = (userId: string) => or(eq(c.userOneId, userId), eq(c.userTwoId, userId));
const readSequence = (userId: string) =>
  sql<number>`CASE WHEN ${c.userOneId} = ${userId} THEN ${c.userOneReadSequence} ELSE ${c.userTwoReadSequence} END`;
const pair = (a: string, b: string) =>
  [a, b].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
const messageFields = {
  id: m.id,
  sequence: m.sequence,
  senderId: m.senderId,
  clientMessageId: m.clientMessageId,
  body: m.body,
  createdAt: m.createdAt,
};
const normalize = (row: DirectMessage): DirectMessage => ({
  ...row,
  createdAt: new Date(row.createdAt).toISOString(),
});
async function peer(userId: string, peerId: string) {
  if (userId === 'swubase' || peerId === 'swubase' || userId === peerId)
    throw new HTTPException(400, { message: 'You cannot message this account.' });
  const [result] = await db
    .select({ id: user.id, displayName: user.displayName, image: user.image })
    .from(user)
    .where(eq(user.id, peerId));
  if (!result) throw new HTTPException(404, { message: 'User not found.' });
  return result;
}
type Reader = Pick<typeof db, 'select'>;
function conversationRows(executor: Reader, userId: string) {
  const other = alias(user, 'message_peer');
  return executor
    .select({
      id: c.id,
      peer: { id: other.id, displayName: other.displayName, image: other.image },
      lastMessage: { body: sql<string>`left(${m.body}, 160)`, senderId: m.senderId },
      updatedAt: sql<string>`to_char(${c.lastMessageAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
      lastSequence: c.lastSequence,
      readSequence: readSequence(userId),
      unreadCount: sql<number>`(SELECT count(*)::int FROM direct_message unread WHERE unread.conversation_id = ${c.id} AND unread.sender_id <> ${userId} AND unread.sequence > ${readSequence(userId)})`,
    })
    .from(c)
    .innerJoin(
      other,
      eq(
        other.id,
        sql`CASE WHEN ${c.userOneId} = ${userId} THEN ${c.userTwoId} ELSE ${c.userOneId} END`,
      ),
    )
    .innerJoin(m, and(eq(m.conversationId, c.id), eq(m.sequence, c.lastSequence)));
}
async function unreadSummary(executor: Reader, userId: string) {
  const [row] = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(c)
    .innerJoin(m, eq(m.conversationId, c.id))
    .where(and(participant(userId), ne(m.senderId, userId), gt(m.sequence, readSequence(userId))));
  return { unreadCount: row?.count ?? 0 };
}
export const messages = {
  async summary(userId: string) {
    return unreadSummary(db, userId);
  },
  async conversations(userId: string, cursor?: ConversationCursor): Promise<ConversationPage> {
    const rows = await conversationRows(db, userId)
      .where(
        and(
          participant(userId),
          cursor
            ? sql`(${c.lastMessageAt}, ${c.id}) < (${cursor.updatedAt}::timestamptz, ${cursor.id}::uuid)`
            : undefined,
        ),
      )
      .orderBy(desc(c.lastMessageAt), desc(c.id))
      .limit(31);
    const items = rows.slice(0, 30),
      last = items.at(-1);
    return {
      items,
      nextCursor: rows.length > 30 && last ? { updatedAt: last.updatedAt, id: last.id } : null,
    };
  },
  async history(userId: string, peerId: string, before?: number): Promise<MessagePage> {
    const other = await peer(userId, peerId);
    const [one, two] = pair(userId, peerId);
    const [conversation] = await db
      .select({ id: c.id, readSequence: readSequence(userId) })
      .from(c)
      .where(and(eq(c.userOneId, one!), eq(c.userTwoId, two!)));
    if (!conversation)
      return { conversationId: null, readSequence: 0, peer: other, items: [], nextBefore: null };
    const rows = await db
      .select(messageFields)
      .from(m)
      .where(
        and(eq(m.conversationId, conversation.id), before ? lt(m.sequence, before) : undefined),
      )
      .orderBy(desc(m.sequence))
      .limit(messagePageSize + 1);
    const items = rows.slice(0, messagePageSize).map(normalize).reverse();
    return {
      conversationId: conversation.id,
      readSequence: conversation.readSequence,
      peer: other,
      items,
      nextBefore: rows.length > messagePageSize ? items[0]!.sequence : null,
    };
  },
  async updates(userId: string, peerId: string, after?: number): Promise<MessageUpdate> {
    await peer(userId, peerId);
    const [one, two] = pair(userId, peerId);
    // Counts, row metadata and deltas describe one committed database snapshot.
    return db.transaction(
      async tx => {
        const [conversation] = await conversationRows(tx, userId).where(
          and(eq(c.userOneId, one!), eq(c.userTwoId, two!)),
        );
        if (!conversation) throw new HTTPException(404, { message: 'Conversation not found.' });
        const rows =
          after === undefined
            ? []
            : await tx
                .select(messageFields)
                .from(m)
                .where(and(eq(m.conversationId, conversation.id), gt(m.sequence, after)))
                .orderBy(m.sequence)
                .limit(messagePageSize + 1);
        return {
          summary: await unreadSummary(tx, userId),
          conversation,
          items: rows.slice(0, messagePageSize).map(normalize),
          hasMore: rows.length > messagePageSize,
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  },
  async send(userId: string, peerId: string, input: { body: string; clientMessageId: string }) {
    await peer(userId, peerId);
    const [one, two] = pair(userId, peerId);
    return db.transaction(async tx => {
      // Serialize this sender's retries/rate limit across conversations and API replicas.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify(['direct-message', userId])}, 0))`,
      );
      const [existing] = await tx
        .select({
          ...messageFields,
          conversationId: m.conversationId,
          one: c.userOneId,
          two: c.userTwoId,
          lastSequence: c.lastSequence,
          readSequence: readSequence(userId),
        })
        .from(m)
        .innerJoin(c, eq(c.id, m.conversationId))
        .where(and(eq(m.senderId, userId), eq(m.clientMessageId, input.clientMessageId)));
      if (existing) {
        if (existing.one !== one || existing.two !== two || existing.body !== input.body)
          throw new HTTPException(409, {
            message: 'This message request was already used. Please send a new message.',
          });
        const {
          conversationId,
          one: _one,
          two: _two,
          lastSequence,
          readSequence,
          ...message
        } = existing;
        return {
          conversationId,
          message: normalize(message),
          change: { conversationId, peerId, lastSequence, readSequence },
        };
      }
      const [recent] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(m)
        .where(and(eq(m.senderId, userId), gt(m.createdAt, sql`now() - interval '1 minute'`)));
      if ((recent?.count ?? 0) >= 60)
        throw new HTTPException(429, {
          message: 'You are sending messages too quickly. Please wait a minute.',
        });
      await tx.insert(c).values({ userOneId: one!, userTwoId: two! }).onConflictDoNothing();
      const [conversation] = await tx
        .select()
        .from(c)
        .where(and(eq(c.userOneId, one!), eq(c.userTwoId, two!)))
        .for('update');
      if (!conversation) throw new Error('Conversation missing after insert');
      const sequence = conversation.lastSequence + 1;
      const [created] = await tx
        .insert(m)
        .values({ conversationId: conversation.id, sequence, senderId: userId, ...input })
        .returning(messageFields);
      await tx
        .update(c)
        .set({ lastSequence: sequence, lastMessageAt: sql`clock_timestamp()` })
        .where(eq(c.id, conversation.id));
      const change = {
        conversationId: conversation.id,
        peerId,
        lastSequence: sequence,
        readSequence:
          conversation.userOneId === userId
            ? conversation.userOneReadSequence
            : conversation.userTwoReadSequence,
      };
      await notifyMessageChanged(tx, userId, change);
      await notifyMessageChanged(tx, peerId, {
        ...change,
        peerId: userId,
        readSequence:
          conversation.userOneId === peerId
            ? conversation.userOneReadSequence
            : conversation.userTwoReadSequence,
      });
      return { conversationId: conversation.id, message: normalize(created!), change };
    });
  },
  async read(userId: string, conversationId: string, throughSequence: number) {
    return db.transaction(async tx => {
      const [conversation] = await tx
        .select()
        .from(c)
        .where(and(eq(c.id, conversationId), participant(userId)))
        .for('update');
      if (!conversation) throw new HTTPException(404, { message: 'Conversation not found.' });
      const field =
        conversation.userOneId === userId ? 'userOneReadSequence' : 'userTwoReadSequence';
      const next = Math.min(throughSequence, conversation.lastSequence);
      const change = {
        conversationId,
        peerId: conversation.userOneId === userId ? conversation.userTwoId : conversation.userOneId,
        lastSequence: conversation.lastSequence,
        readSequence: Math.max(next, conversation[field]),
      };
      if (next <= conversation[field]) return { success: true, change };
      await tx
        .update(c)
        .set({ [field]: next })
        .where(eq(c.id, conversationId));
      await notifyMessageChanged(tx, userId, change);
      return { success: true, change };
    });
  },
};
