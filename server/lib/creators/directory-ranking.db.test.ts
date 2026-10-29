import { expect, test } from 'bun:test';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { user } from '../../db/schema/auth-schema.ts';
import {
  creatorProfile,
  creatorChannel,
  creatorYoutubeChannel,
} from '../../db/schema/creator_hub.ts';
import { creatorFollow } from '../../db/schema/follow.ts';
import { createFollowService } from '../follows/service.ts';
import { createProfilesService } from './profiles.ts';
import { creatorProfileSchema } from '../../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';

test.skipIf(process.env.CREATOR_HUB_DB_TEST !== '1')(
  'directory ranks stored follower counts, then the largest fresh YouTube channel before pagination',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const prefix = `ranking-${crypto.randomUUID()}`;
    const people = Array.from({ length: 8 }, (_, i) => `${prefix}-${i}`);
    const profiles = Array.from({ length: 27 }, () => crypto.randomUUID());
    const channels: string[] = [];
    const followers = createFollowService(db);
    const directory = createProfilesService(db);
    const now = new Date().toISOString();
    const old = new Date(Date.now() - 29 * 86400_000).toISOString();
    const results = async (page = 1, language?: string) =>
      (await directory.profiles(prefix, page, language)).items.map(item => item.id);
    const count = async (id: string) =>
      (await db.select().from(creatorProfile).where(eq(creatorProfile.id, id)))[0]?.followerCount;
    const channel = async (
      index: number,
      subscribers: number | null,
      age = now,
      origin: 'public' | 'curated' = 'public',
      resolvedAt: string | null = null,
    ) => {
      const id = `UC${crypto.randomUUID().replaceAll('-', '').slice(0, 22)}`;
      channels.push(id);
      await db
        .insert(creatorYoutubeChannel)
        .values({ channelId: id, subscriberCount: subscribers, subscribersUpdatedAt: age });
      await db
        .insert(creatorChannel)
        .values({ creatorId: profiles[index], channelId: id, origin, resolvedAt });
      return id;
    };
    try {
      await db.insert(user).values(
        people.map(id => ({
          id,
          name: 'Fixture',
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      for (const [i, id] of profiles.entries()) {
        const profile = creatorProfileSchema.parse({
          slug: `${prefix}-${String(i).padStart(2, '0')}`,
          name: `${prefix} ${i}`,
          bio: emptyPostDocument(),
          languages: [i === 26 ? 'fr' : 'en'],
          specialties: [],
          links: [],
        });
        await db.insert(creatorProfile).values({
          id,
          slug: profile.slug,
          profile,
          ownerId: i === 7 || i === 8 ? null : people[0],
        });
      }
      await channel(0, 10);
      await channel(1, 8_000_000_000);
      await channel(2, 60);
      const largest = await channel(2, 70);
      await channel(3, 100);
      await channel(4, 100);
      await channel(5, 10_000_000, old);
      await channel(6, null);
      await channel(7, 10_000_000, now, 'curated', old);
      const curatedChannel = await channel(8, 500, now, 'curated');
      await Promise.all(
        people.slice(0, 3).map(id => followers.set('creators', profiles[0], id, true)),
      );
      await Promise.all(
        people.slice(0, 2).map(id => followers.set('creators', profiles[1], id, true)),
      );
      expect(await count(profiles[0])).toBe(3);
      expect(
        (await followers.statuses('creators', [profiles[0]], people[0]))[profiles[0]],
      ).toMatchObject({ following: true, followerCount: 3 });
      const expected = [
        0,
        1,
        8,
        3,
        4,
        2,
        5,
        6,
        7,
        ...Array.from({ length: 18 }, (_, i) => i + 9),
      ].map(i => profiles[i]);
      expect(await results()).toEqual(expected.slice(0, 24));
      expect(await results(2)).toEqual(expected.slice(24));
      expect(await results(1, 'fr')).toEqual([profiles[26]]);
      // A shared curated channel is conflicted; neither profile gets its count.
      await db
        .insert(creatorChannel)
        .values({ creatorId: profiles[7], channelId: curatedChannel, origin: 'curated' });
      expect((await results()).slice(0, 6)).toEqual([0, 1, 3, 4, 2, 5].map(i => profiles[i]));
      await db
        .update(creatorChannel)
        .set({ resolvedAt: old })
        .where(
          and(
            eq(creatorChannel.creatorId, profiles[7]),
            eq(creatorChannel.channelId, curatedChannel),
          ),
        );
      expect(await results()).toEqual(expected.slice(0, 24));
      // Missing/expired larger channels cannot hide a smaller current channel.
      await channel(2, 1_000_000, old);
      await db
        .update(creatorYoutubeChannel)
        .set({ subscriberCount: 200 })
        .where(eq(creatorYoutubeChannel.channelId, largest));
      expect((await results()).slice(0, 6)).toEqual([0, 1, 8, 2, 3, 4].map(i => profiles[i]));
      await db
        .delete(creatorChannel)
        .where(
          and(eq(creatorChannel.creatorId, profiles[2]), eq(creatorChannel.channelId, largest)),
        );
      expect((await results()).slice(0, 6)).toEqual(expected.slice(0, 6));
      // Retries, concurrent distinct followers and account deletion must not drift.
      await Promise.all(people.map(id => followers.set('creators', profiles[0], id, true)));
      await Promise.all(people.map(id => followers.set('creators', profiles[0], id, true)));
      expect(await count(profiles[0])).toBe(people.length);
      await Promise.all(
        people.slice(3).map(id => followers.set('creators', profiles[0], id, false)),
      );
      await Promise.all(
        people.slice(3).map(id => followers.set('creators', profiles[0], id, false)),
      );
      expect(await count(profiles[0])).toBe(3);
      await db.delete(user).where(eq(user.id, people[2]));
      expect(await count(profiles[0])).toBe(2);
      expect((await results())[0]).toBe(profiles[1]);
      // Direct relationship changes use the same counter invariant.
      await db
        .update(creatorFollow)
        .set({ creatorId: profiles[4] })
        .where(
          and(
            eq(creatorFollow.creatorId, profiles[0]),
            eq(creatorFollow.followerUserId, people[1]),
          ),
        );
      expect(await count(profiles[0])).toBe(1);
      expect(await count(profiles[4])).toBe(1);
      await followers.set('creators', profiles[1], people[0], false);
      await followers.set('creators', profiles[1], people[1], false);
      expect((await results()).slice(0, 2)).toEqual([profiles[4], profiles[0]]);
      // Exercise a table-only wipe without leaving changes in the shared local fixture DB.
      const rollback = new Error('rollback follower truncation fixture');
      await expect(
        db.transaction(async tx => {
          await tx.execute(sql`TRUNCATE creator_follow`);
          const rows = await tx
            .select({ count: creatorProfile.followerCount })
            .from(creatorProfile)
            .where(inArray(creatorProfile.id, profiles));
          expect(rows.every(row => row.count === 0)).toBe(true);
          throw rollback;
        }),
      ).rejects.toBe(rollback);
      expect(await count(profiles[0])).toBe(1);
    } finally {
      await db.delete(creatorProfile).where(inArray(creatorProfile.id, profiles));
      if (channels.length)
        await db
          .delete(creatorYoutubeChannel)
          .where(inArray(creatorYoutubeChannel.channelId, channels));
      await db.delete(user).where(inArray(user.id, people));
    }
  },
  30_000,
);

test.skipIf(process.env.CREATOR_HUB_DB_TEST !== '1')(
  'follower migration backfills existing relationships',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const migration = await Bun.file(
      new URL('../../../drizzle/0096_creator_directory_ranking.sql', import.meta.url),
    ).text();
    const backfill = migration
      .split('--> statement-breakpoint')
      .find(statement => statement.trimStart().startsWith('UPDATE creator_profile AS profile'));
    expect(backfill).toBeDefined();
    await db.transaction(async tx => {
      await tx.execute(
        sql`CREATE TEMP TABLE creator_profile (id text PRIMARY KEY, follower_count integer) ON COMMIT DROP`,
      );
      await tx.execute(sql`CREATE TEMP TABLE creator_follow (creator_id text) ON COMMIT DROP`);
      await tx.execute(sql`INSERT INTO creator_profile VALUES ('followed', 0), ('empty', 12)`);
      await tx.execute(sql`INSERT INTO creator_follow VALUES ('followed'), ('followed')`);
      await tx.execute(sql.raw(backfill!));
      const rows = await tx.execute(
        sql`SELECT id, follower_count FROM creator_profile ORDER BY id`,
      );
      expect(Array.from(rows)).toEqual([
        { id: 'empty', follower_count: 0 },
        { id: 'followed', follower_count: 2 },
      ]);
    });
  },
);
