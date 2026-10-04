import { z } from 'zod';

export const messageMaxLength = 5000;
export const messagePeerSchema = z.object({ userId: z.string().min(1).max(128) });
export const sendMessageSchema = z.strictObject({
  clientMessageId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, 'Write a message first.')
    .max(messageMaxLength)
    .refine(value => !value.includes('\0'), 'Message contains an unsupported character.'),
});
export const readMessagesSchema = z.strictObject({
  throughSequence: z.number().int().positive().max(2147483647),
});
export const conversationCursorSchema = z.strictObject({
  updatedAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});
export type ConversationCursor = z.infer<typeof conversationCursorSchema>;
export type MessagePeer = { id: string; displayName: string; image: string | null };
export type DirectMessage = {
  id: string;
  sequence: number;
  senderId: string;
  clientMessageId: string;
  body: string;
  createdAt: string;
};
export type ConversationSummary = {
  id: string;
  peer: MessagePeer;
  lastMessage: { body: string; senderId: string };
  updatedAt: string;
  unreadCount: number;
  lastSequence: number;
  readSequence: number;
};
export type ConversationPage = {
  items: ConversationSummary[];
  nextCursor: ConversationCursor | null;
};
export type MessagePage = {
  conversationId: string | null;
  readSequence: number;
  peer: MessagePeer;
  items: DirectMessage[];
  nextBefore: number | null;
};

// Recipient-specific cursors only; message bodies stay on authenticated HTTP.
export const messageChangeSchema = z.strictObject({
  conversationId: z.uuid(),
  peerId: z.string().min(1).max(128),
  lastSequence: z.number().int().nonnegative().max(2147483647),
  readSequence: z.number().int().nonnegative().max(2147483647),
});
export type MessageChange = z.infer<typeof messageChangeSchema>;
export const messageUpdatesQuerySchema = z.strictObject({
  after: z.coerce.number().int().nonnegative().max(2147483647).optional(),
});
export type MessageUpdate = {
  summary: { unreadCount: number };
  conversation: ConversationSummary;
  items: DirectMessage[];
  hasMore: boolean;
};
