import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import { createPatreonAdminRoute } from '../../routes/admin/patreon/index.ts';
import { createPatreonService } from './service.ts';
import { createPatreonCredits } from './credits.ts';
import { patreonConnection, patreonMember } from '../../db/schema/patreon.ts';
import type { MemberSnapshot } from './model.ts';

test.skipIf(process.env.PATREON_DB_TEST !== '1')(
  'admin authorization, backfill and webhook share one award path',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    const campaignId = crypto.randomUUID();
    const originalClientId = process.env.PATREON_CLIENT_ID;
    const clientId = crypto.randomUUID();
    process.env.PATREON_CLIENT_ID = clientId;
    let actor: string | null = null;
    let total = 250;
    let fetches = 0;
    let missing = false;
    let invalidMember = false;
    let invalidList = false;
    let clock = Date.now();
    const snapshot = (): MemberSnapshot => ({
      campaignId,
      memberId: 'fixture-member',
      email: `${ids[0]}@example.invalid`,
      name: 'Fixture',
      lifetimeCents: total,
      patronStatus: 'active_patron',
      lastChargeAt: null,
      lastChargeStatus: 'Paid',
      observedAt: new Date(++clock),
    });
    const client = {
      campaign: async () => {
        fetches++;
        return campaignId;
      },
      members: async function* () {
        yield snapshot();
        if (invalidList) {
          yield {
            invalid: true as const,
            campaignId,
            memberId: 'invalid-list-record',
            observedAt: new Date(++clock),
          };
          yield { ...snapshot(), memberId: 'after-invalid', lifetimeCents: 100 };
        }
      },
      member: async () => ({
        member: missing || invalidMember ? null : snapshot(),
        invalid: invalidMember,
        observedAt: new Date(++clock),
      }),
    };
    const service = createPatreonService({ client, credits: createPatreonCredits() });
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        c.set(
          'user',
          actor ? ({ id: actor } as NonNullable<AuthExtension['Variables']['user']>) : null,
        );
        await next();
      })
      .route('/admin', createPatreonAdminRoute(service));
    const sync = () =>
      app.request('/admin/sync', { method: 'POST', headers: { 'X-Requested-With': 'swubase' } });
    try {
      await db.insert(user).values(
        ids.map((id, i) => ({
          id,
          name: 'Fixture',
          displayName: id,
          email: `${id}@example.invalid`,
          emailVerified: true,
          currency: 'USD',
          role: i ? 'admin' : 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      await db.insert(patreonConnection).values({
        clientId,
        campaignId,
        currency: 'USD',
        accessTokenEnc: 'private-token-fixture',
        refreshTokenEnc: 'private-refresh-fixture',
      });
      expect((await app.request('/admin')).status).toBe(401);
      expect((await sync()).status).toBe(401);
      actor = ids[0];
      expect((await app.request('/admin')).status).toBe(403);
      expect((await sync()).status).toBe(403);
      expect(fetches).toBe(0);
      actor = ids[1];
      expect((await app.request('/admin/sync', { method: 'POST' })).status).toBe(403);
      expect((await app.request('/admin?page=0')).status).toBe(400);
      expect((await (await sync()).json()).data).toEqual({
        members: 1,
        skipped: 0,
        awards: 1,
        credits: 2500,
      });
      expect((await (await sync()).json()).data.credits).toBe(0);
      total = 500;
      await Promise.all([service.sync(), service.webhook(campaignId, 'fixture-member')]);
      const response = await app.request('/admin');
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
      const body = await response.json();
      expect(body.data.members[0].balance).toBe(5000);
      expect(body.data.members[0].creditedCents).toBe(500);
      expect(body.data.lastWebhookAt).not.toBeNull();
      expect(JSON.stringify(body)).not.toContain('private-token-fixture');
      expect(JSON.stringify(body)).not.toContain('accessTokenEnc');
      await db
        .update(patreonMember)
        .set({ reviewReason: 'payment_review' })
        .where(eq(patreonMember.campaignId, campaignId));
      total = 600;
      const approve = () =>
        app.request('/admin/fixture-member/review', {
          method: 'POST',
          headers: { 'X-Requested-With': 'swubase' },
        });
      actor = ids[0];
      expect((await approve()).status).toBe(403);
      actor = ids[1];
      expect((await app.request('/admin/fixture-member/review', { method: 'POST' })).status).toBe(
        403,
      );
      expect((await (await approve()).json()).data.credits).toBe(1000);
      expect((await approve()).status).toBe(409);
      invalidMember = true;
      await service.webhook(campaignId, 'fixture-member');
      expect((await (await app.request('/admin')).json()).data.members[0].reviewReason).toBe(
        'invalid_member',
      );
      invalidMember = false;
      await service.webhook(campaignId, 'fixture-member');
      expect((await (await app.request('/admin')).json()).data.members[0].reviewReason).toBeNull();
      await expect(service.webhook('different-campaign', 'fixture-member')).rejects.toThrow(
        'does not match',
      );
      missing = true;
      await service.webhook(campaignId, 'fixture-member');
      const [deleted] = await db
        .select()
        .from(patreonMember)
        .where(eq(patreonMember.campaignId, campaignId));
      expect(deleted.deletedAt).not.toBeNull();
      expect((await (await app.request('/admin')).json()).data.members[0].balance).toBe(6000);
      invalidList = true;
      expect(await service.sync()).toEqual({ members: 3, skipped: 1, awards: 1, credits: 1000 });
      expect((await service.overview(1)).lastSyncSkipped).toBe(1);
      const [invalid] = await db
        .select()
        .from(patreonMember)
        .where(eq(patreonMember.memberId, 'invalid-list-record'));
      expect(invalid.reviewReason).toBe('invalid_member');
    } finally {
      if (originalClientId === undefined) delete process.env.PATREON_CLIENT_ID;
      else process.env.PATREON_CLIENT_ID = originalClientId;
      await db.delete(patreonMember).where(eq(patreonMember.campaignId, campaignId));
      await db.delete(patreonConnection).where(eq(patreonConnection.clientId, clientId));
      await db.delete(user).where(inArray(user.id, ids));
    }
  },
  30_000,
);
