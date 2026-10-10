import { z } from 'zod';
import { messageChangeSchema, type MessageChange } from './messages.ts';

export const notificationTypes = [
  'crossfire.invitation',
  'deck.favorite',
  'deck.comment',
  'comment.reply',
  'team.member.joined',
] as const;
export type NotificationType = (typeof notificationTypes)[number];
export const notificationDefinitions = {
  'crossfire.invitation': { label: 'Crossfire game invitations', mandatory: true },
  'deck.favorite': { label: 'Deck favorites', mandatory: false },
  'deck.comment': { label: 'Deck comments', mandatory: false },
  'comment.reply': { label: 'Comment replies', mandatory: false },
  'team.member.joined': { label: 'New team members', mandatory: false },
} as const;
export const notificationCursorSchema = z.strictObject({
  createdAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});
export type NotificationCursor = z.infer<typeof notificationCursorSchema>;
export const notificationActionSchema = z.strictObject({
  action: z.enum(['read', 'unread', 'archive']),
});
export interface NotificationItem {
  id: string;
  type: NotificationType;
  entityId: string;
  actorUserId: string | null;
  actorName: string | null;
  entityName: string | null;
  targetDeckId?: string | null;
  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
  available: boolean;
  expiresAt: string | null;
}
export interface NotificationPage {
  items: NotificationItem[];
  nextCursor: NotificationCursor | null;
}
export const appSubscriptionSchema = z.discriminatedUnion('topic', [
  z.strictObject({ topic: z.literal('game-results'), teamId: z.uuid().optional() }),
  z.strictObject({ topic: z.literal('live-tournaments'), weekendId: z.uuid() }),
]);
export type AppSubscription = z.infer<typeof appSubscriptionSchema>;
export const appClientMessageSchema = z.discriminatedUnion('type', [
  z.strictObject({ v: z.literal(1), type: z.literal('ping') }),
  z.strictObject({
    v: z.literal(1),
    type: z.literal('subscribe'),
    subscription: appSubscriptionSchema,
  }),
  z.strictObject({
    v: z.literal(1),
    type: z.literal('unsubscribe'),
    subscription: appSubscriptionSchema,
  }),
]);
export type AppClientMessage = z.infer<typeof appClientMessageSchema>;
export type AppControlEvent =
  | {
      v: 1;
      type:
        | 'app.connected'
        | 'app.resync'
        | 'pong'
        | 'notifications.changed'
        | 'user.settings.changed';
    }
  | { v: 1; type: 'messages.changed'; change?: MessageChange }
  | { v: 1; type: 'subscription.denied'; topic: AppSubscription['topic'] };
export const userNotificationChannel = 'user_notifications';
export const userNotificationSignalSchema = z.strictObject({
  userId: z.string().min(1).max(128),
  type: z.enum(['notifications.changed', 'user.settings.changed', 'messages.changed']),
  change: messageChangeSchema.optional(),
});
