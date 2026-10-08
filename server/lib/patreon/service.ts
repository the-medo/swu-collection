import { count, desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { patreonConnection, patreonMember } from '../../db/schema/patreon.ts';
import { userProfile } from '../../db/schema/user_profile.ts';
import { patreonClient } from './client.ts';
import { patreonCredits } from './credits.ts';
import { PatreonError, patreonConfigured } from './config.ts';
import type { PatreonOverview, PatreonSyncResult } from '../../../shared/types/patreon.ts';

export function createPatreonService({
  database = db,
  client = patreonClient,
  credits = patreonCredits,
} = {}) {
  const clientId = () => process.env.PATREON_CLIENT_ID ?? '';
  return {
    async sync(): Promise<PatreonSyncResult> {
      const campaignId = await client.campaign();
      const result = { members: 0, skipped: 0, awards: 0, credits: 0 };
      for await (const member of client.members(campaignId)) {
        result.members++;
        if ('invalid' in member) {
          result.skipped++;
          if (member.memberId)
            await credits.markInvalid(campaignId, member.memberId, member.observedAt);
          continue;
        }
        const amount = await credits.apply(member);
        if (amount > 0) {
          result.awards++;
          result.credits += amount;
        }
      }
      await database
        .update(patreonConnection)
        .set({ lastSyncAt: new Date(), lastSyncSkipped: result.skipped })
        .where(eq(patreonConnection.clientId, clientId()));
      return result;
    },
    async webhook(campaignId: string, memberId: string) {
      const expectedCampaign = await client.campaign();
      if (campaignId !== expectedCampaign)
        throw new PatreonError('Webhook campaign does not match this creator.', 400);
      // Signed webhook payloads can be duplicated, sparse, or out of order.
      // Re-fetch authoritative lifetime support; never award from the payload.
      const result = await client.member(campaignId, memberId);
      if (result.invalid) await credits.markInvalid(campaignId, memberId, result.observedAt);
      else if (result.member) await credits.apply(result.member);
      else await credits.markDeleted(campaignId, memberId, result.observedAt);
      await database
        .update(patreonConnection)
        .set({ lastWebhookAt: new Date() })
        .where(eq(patreonConnection.clientId, clientId()));
    },
    async review(memberId: string, actorId: string) {
      const campaignId = await client.campaign();
      const result = await client.member(campaignId, memberId);
      if (!result.member || result.invalid)
        throw new PatreonError(
          'A valid current member record is required before review can be completed.',
          409,
        );
      return { credits: await credits.apply(result.member, actorId) };
    },
    async overview(page: number): Promise<PatreonOverview> {
      const [connection] = await database
        .select({
          campaignId: patreonConnection.campaignId,
          currency: patreonConnection.currency,
          lastSyncAt: patreonConnection.lastSyncAt,
          lastSyncSkipped: patreonConnection.lastSyncSkipped,
          lastWebhookAt: patreonConnection.lastWebhookAt,
        })
        .from(patreonConnection)
        .where(eq(patreonConnection.clientId, clientId()));
      const campaignId = connection?.campaignId ?? null;
      const pageSize = 50;
      const where = eq(patreonMember.campaignId, campaignId ?? '');
      const [total] = await database.select({ count: count() }).from(patreonMember).where(where);
      const rows = await database
        .select({
          member: patreonMember,
          displayName: user.displayName,
          balance: userProfile.creditBalance,
        })
        .from(patreonMember)
        .leftJoin(user, eq(user.id, patreonMember.userId))
        .leftJoin(userProfile, eq(userProfile.userId, patreonMember.userId))
        .where(where)
        .orderBy(desc(patreonMember.lifetimeCents), patreonMember.memberId)
        .limit(pageSize)
        .offset((page - 1) * pageSize);
      return {
        configured: patreonConfigured(),
        webhookConfigured: !!process.env.PATREON_WEBHOOK_SECRET?.trim(),
        campaignId,
        currency: connection?.currency ?? null,
        lastSyncAt: connection?.lastSyncAt?.toISOString() ?? null,
        lastSyncSkipped: connection?.lastSyncSkipped ?? 0,
        lastWebhookAt: connection?.lastWebhookAt?.toISOString() ?? null,
        page,
        pageSize,
        total: total.count,
        members: rows.map(({ member: m, displayName, balance }) => ({
          memberId: m.memberId,
          email: m.email,
          name: m.name,
          userId: m.userId,
          displayName,
          patronStatus: m.patronStatus,
          lastChargeAt: m.lastChargeAt?.toISOString() ?? null,
          lastChargeStatus: m.lastChargeStatus,
          lifetimeCents: m.lifetimeCents,
          creditedCents: m.creditedCents,
          balance: m.userId ? (balance ?? 0) : null,
          reviewReason: m.reviewReason,
          reviewedAt: m.reviewedAt?.toISOString() ?? null,
          observedAt: m.observedAt.toISOString(),
        })),
      };
    },
  };
}

export const patreonService = createPatreonService();
