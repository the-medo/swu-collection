import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { discordNotification } from '../../db/schema/discord_notification.ts';
import type { DiscordNotification } from '../../db/schema/discord_notification.ts';
import type {
  DiscordNotificationClaimInput,
  DiscordNotificationClaimResult,
  DiscordNotificationIdentity,
  DiscordNotificationPayload,
  DiscordNotificationStatus,
} from './types.ts';

type UpdateNotificationInput = Pick<
  DiscordNotificationIdentity,
  'notificationType' | 'scopeKey'
> & {
  payload?: DiscordNotificationPayload | null;
};

export type MarkDiscordNotificationSuccessInput = UpdateNotificationInput & {
  discordMessageId: string;
  sentAt?: string;
};

export type MarkDiscordNotificationFailedInput = UpdateNotificationInput & {
  error: string;
};

function notificationScopeWhere(
  identity: Pick<DiscordNotificationIdentity, 'notificationType' | 'scopeKey'>,
) {
  return and(
    eq(discordNotification.notificationType, identity.notificationType),
    eq(discordNotification.scopeKey, identity.scopeKey),
  );
}

function nowIsoString() {
  return new Date().toISOString();
}

function toJsonPayload(payload: DiscordNotificationPayload | null | undefined) {
  return payload === undefined ? undefined : ((payload ?? null) as Record<string, unknown> | null);
}

export async function getNotificationByScope(
  identity: Pick<DiscordNotificationIdentity, 'notificationType' | 'scopeKey'>,
): Promise<DiscordNotification | undefined> {
  return (
    await db.select().from(discordNotification).where(notificationScopeWhere(identity)).limit(1)
  )[0];
}

export async function hasSuccessfulNotification(
  identity: Pick<DiscordNotificationIdentity, 'notificationType' | 'scopeKey'>,
) {
  const notification = await getNotificationByScope(identity);
  return notification?.status === 'success';
}

export async function claimNotificationForSend({
  notificationType,
  scopeType,
  scopeId,
  scopeKey,
  discordChannelId,
  payload,
  force = false,
}: DiscordNotificationClaimInput): Promise<DiscordNotificationClaimResult> {
  const now = nowIsoString();

  const [inserted] = await db
    .insert(discordNotification)
    .values({
      notificationType,
      scopeType,
      scopeId: scopeId ?? null,
      scopeKey,
      discordChannelId,
      status: 'sending' satisfies DiscordNotificationStatus,
      error: null,
      payload: toJsonPayload(payload) ?? null,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: [discordNotification.notificationType, discordNotification.scopeKey],
    })
    .returning();

  if (inserted) {
    return {
      claimed: true,
      notification: inserted,
      forced: false,
    };
  }

  const existing = await getNotificationByScope({ notificationType, scopeKey });

  if (!force) {
    return {
      claimed: false,
      notification: existing,
      reason: existing
        ? `Discord notification already exists with status ${existing.status}.`
        : 'Discord notification already exists but could not be loaded.',
    };
  }

  const [updated] = await db
    .update(discordNotification)
    .set({
      scopeType,
      scopeId: scopeId ?? null,
      discordChannelId,
      status: 'sending',
      error: null,
      payload: toJsonPayload(payload) ?? null,
      updatedAt: now,
    })
    .where(notificationScopeWhere({ notificationType, scopeKey }))
    .returning();

  if (!updated) {
    return {
      claimed: false,
      notification: existing,
      reason: 'Discord notification could not be claimed for forced send.',
    };
  }

  return {
    claimed: true,
    notification: updated,
    forced: true,
  };
}

export async function markNotificationSuccess({
  notificationType,
  scopeKey,
  discordMessageId,
  payload,
  sentAt = nowIsoString(),
}: MarkDiscordNotificationSuccessInput): Promise<DiscordNotification | undefined> {
  return (
    await db
      .update(discordNotification)
      .set({
        discordMessageId,
        status: 'success',
        error: null,
        payload: toJsonPayload(payload),
        sentAt,
        updatedAt: nowIsoString(),
      })
      .where(notificationScopeWhere({ notificationType, scopeKey }))
      .returning()
  )[0];
}

export async function markNotificationFailed({
  notificationType,
  scopeKey,
  error,
  payload,
}: MarkDiscordNotificationFailedInput): Promise<DiscordNotification | undefined> {
  return (
    await db
      .update(discordNotification)
      .set({
        status: 'failed',
        error,
        payload: toJsonPayload(payload),
        updatedAt: nowIsoString(),
      })
      .where(notificationScopeWhere({ notificationType, scopeKey }))
      .returning()
  )[0];
}
