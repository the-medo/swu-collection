import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { patreonConnection } from '../../db/schema/patreon.ts';
import { createPatreonClient, tokenCodec } from './client.ts';

test.skipIf(process.env.PATREON_DB_TEST !== '1')(
  'provider pagination, encrypted token rotation, restart and concurrent refresh',
  async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const settings = {
      clientId: crypto.randomUUID(),
      clientSecret: 'fixture-client-secret',
      accessToken: 'expired',
      refreshToken: 'initial-refresh',
      encryptionKey: 'fixture-encryption-key-with-at-least-32-characters',
    };
    let refreshes = 0;
    let phase = 1;
    const cursors: Array<string | null> = [];
    const fetcher = async (input: string | URL, init?: RequestInit) => {
      const url = new URL(input);
      expect(url.origin).toBe('https://www.patreon.com');
      expect(init?.redirect).toBe('error');
      if (url.pathname.endsWith('/token')) {
        refreshes++;
        const body = new URLSearchParams(init?.body as URLSearchParams);
        expect(body.get('client_secret')).toBe(settings.clientSecret);
        expect(body.get('refresh_token')).toBe(
          phase === 1 ? 'initial-refresh' : 'rotated-refresh-1',
        );
        return Response.json({
          access_token: `access-${phase}`,
          refresh_token: `rotated-refresh-${phase}`,
          expires_in: 3600,
        });
      }
      if (new Headers(init?.headers).get('Authorization') !== `Bearer access-${phase}`)
        return new Response(null, { status: 401 });
      if (url.pathname.endsWith('/campaigns'))
        return Response.json({ data: [{ id: 'campaign', attributes: { currency: 'USD' } }] });
      if (url.pathname.endsWith('/members')) {
        const cursor = url.searchParams.get('page[cursor]');
        cursors.push(cursor);
        expect(url.searchParams.get('include')).toBe('campaign');
        const data: unknown[] = [
          {
            id: cursor ? 'two' : 'one',
            type: 'member',
            attributes: {
              email: ' FIXTURE@example.invalid ',
              campaign_lifetime_support_cents: 123,
            },
            relationships: { campaign: { data: { id: 'campaign', type: 'campaign' } } },
          },
        ];
        if (!cursor)
          data.push({
            id: 'bad',
            type: 'member',
            attributes: { campaign_lifetime_support_cents: -100 },
          });
        return Response.json({
          data,
          meta: { pagination: { cursors: { next: cursor ? null : 'next-page' } } },
        });
      }
      return new Response(null, { status: 404 });
    };
    try {
      const client = createPatreonClient({ config: () => settings, fetcher });
      expect(await Promise.all(Array.from({ length: 5 }, () => client.campaign()))).toEqual(
        Array(5).fill('campaign'),
      );
      expect(refreshes).toBe(1);
      const [stored] = await db
        .select()
        .from(patreonConnection)
        .where(eq(patreonConnection.clientId, settings.clientId));
      expect(stored.accessTokenEnc).not.toContain('access-1');
      expect(tokenCodec(settings.encryptionKey).decrypt(stored.refreshTokenEnc)).toBe(
        'rotated-refresh-1',
      );
      const restarted = createPatreonClient({ config: () => settings, fetcher });
      phase = 2;
      expect(await restarted.campaign()).toBe('campaign');
      expect(refreshes).toBe(2);
      const members = [];
      for await (const member of restarted.members('campaign')) members.push(member);
      expect(cursors).toEqual([null, 'next-page']);
      expect(members.map(m => m.memberId)).toEqual(['one', 'bad', 'two']);
      expect('invalid' in members[0] ? null : members[0].email).toBe('fixture@example.invalid');
      expect('invalid' in members[1]).toBe(true);
      expect((await restarted.member('campaign', 'missing')).member).toBeNull();

      const wrongCurrency = createPatreonClient({
        config: () => settings,
        fetcher: async () =>
          Response.json({ data: [{ id: 'campaign', attributes: { currency: 'EUR' } }] }),
      });
      await expect(wrongCurrency.campaign()).rejects.toThrow('USD');
      const limited = createPatreonClient({
        config: () => settings,
        fetcher: async () => new Response('private upstream error', { status: 429 }),
      });
      await expect(limited.campaign()).rejects.toThrow('rate limit');
      const invalid = createPatreonClient({
        config: () => settings,
        fetcher: async () => Response.json({ data: [] }),
      });
      await expect(invalid.campaign()).rejects.toThrow('exactly one');
    } finally {
      await db.delete(patreonConnection).where(eq(patreonConnection.clientId, settings.clientId));
    }
  },
  30_000,
);
