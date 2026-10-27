import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray, sql } from 'drizzle-orm';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db/index.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { creation, creatorProfile } from '../../db/schema/creator_hub.ts';
import { creatorFollow, userFollow } from '../../db/schema/follow.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckInformation } from '../../db/schema/deck_information.ts';
import { createFollowsRoute } from '../../routes/follows.ts';
import { createCreatorHubRoute } from '../../routes/creator-hub.ts';
import { deckRoute } from '../../routes/deck.ts';
import { followService } from './service.ts';
import { creatorService } from '../creators/service.ts';
import {
  creationDocumentSchema,
  creatorProfileSchema,
} from '../../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';

test.skipIf(process.env.FOLLOWS_DB_TEST !== '1')(
  'follow privacy, idempotence, discovery, deletion and dump sanitization',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const users = Array.from({ length: 4 }, () => `follow-${crypto.randomUUID()}`);
    const [viewer, author, stranger, otherViewer] = users;
    const creatorId = crypto.randomUUID();
    const otherCreator = crypto.randomUUID();
    const deckIds = Array.from({ length: 4 }, () => crypto.randomUUID());
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const id = c.req.header('x-fixture-user');
        c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
        await next();
      })
      .route('/follows', createFollowsRoute())
      .route('/content', createCreatorHubRoute())
      .route('/decks', deckRoute);
    const request = (who: string | null, method: string, path: string, customHeader = true) =>
      app.request(path, {
        method,
        headers: {
          ...(who ? { 'x-fixture-user': who } : {}),
          ...(customHeader ? { 'X-Requested-With': 'swubase' } : {}),
        },
      });
    const json = async (who: string | null, path: string) => {
      const response = await request(who, 'GET', path);
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
      return response.json();
    };
    const profile = creatorProfileSchema.parse({
      slug: `follow-${creatorId}`,
      name: 'Followed studio',
      bio: emptyPostDocument(),
      languages: ['en'],
      specialties: [],
      links: [],
    });
    const document = creationDocumentSchema.parse({
      title: 'Follow publication',
      medium: 'article',
      body: emptyPostDocument(),
      language: 'en',
      tags: [],
      references: [],
      chapters: [],
    });
    try {
      await db.insert(user).values(
        users.map(id => ({
          id,
          name: 'PRIVATE LEGAL NAME',
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      await db.insert(creatorProfile).values([
        { id: creatorId, slug: profile.slug, profile }, // Unowned curated creator.
        {
          id: otherCreator,
          ownerId: author,
          slug: `other-${creatorId}`,
          profile: { ...profile, slug: `other-${creatorId}` },
        },
      ]);
      expect((await request(null, 'GET', '/follows?kind=users')).status).toBe(401);
      expect((await request(null, 'PUT', `/follows/users/${author}`)).status).toBe(401);
      expect((await request(null, 'DELETE', `/follows/users/${author}`)).status).toBe(401);
      expect((await request(viewer, 'PUT', `/follows/users/${author}`, false)).status).toBe(403);
      expect((await request(viewer, 'PUT', `/follows/users/${viewer}`)).status).toBe(400);
      expect((await request(viewer, 'PUT', '/follows/users/swubase')).status).toBe(400);
      expect((await request(viewer, 'PUT', '/follows/creators/invalid')).status).toBe(400);
      expect(
        (await request(viewer, 'PUT', `/follows/creators/${crypto.randomUUID()}`)).status,
      ).toBe(404);
      expect((await request(viewer, 'GET', '/follows/creators/status?ids=invalid')).status).toBe(
        400,
      );
      expect(
        (
          await request(
            viewer,
            'GET',
            `/follows/users/status?ids=${Array.from({ length: 25 }, (_, i) => i).join(',')}`,
          )
        ).status,
      ).toBe(400);
      expect((await request(viewer, 'GET', '/follows?kind=users&page=0')).status).toBe(400);

      const responses = await Promise.all(
        Array.from({ length: 3 }, () => request(viewer, 'PUT', `/follows/users/${author}`)),
      );
      expect(responses.map(r => r.status)).toEqual([200, 200, 200]);
      expect((await json(viewer, `/follows/users/status?ids=${author},${viewer}`)).data).toEqual({
        [author]: { following: true, followerCount: 1, canFollow: true },
        [viewer]: { following: false, followerCount: 0, canFollow: false },
      });
      expect((await json(null, `/follows/users/status?ids=${author}`)).data[author]).toEqual({
        following: false,
        followerCount: 1,
        canFollow: true,
      });
      const ownList = await json(viewer, '/follows?kind=users');
      expect(ownList.data.items.map((item: { id: string }) => item.id)).toEqual([author]);
      expect(JSON.stringify(ownList)).not.toContain('PRIVATE LEGAL NAME');
      expect(JSON.stringify(ownList)).not.toContain('@invalid.local');
      expect((await json(otherViewer, `/follows?kind=users&userId=${viewer}`)).data.items).toEqual(
        [],
      );
      expect((await request(otherViewer, 'DELETE', `/follows/users/${author}`)).status).toBe(200);
      expect((await followService.statuses('users', [author], viewer))[author].following).toBe(
        true,
      );
      expect((await request(viewer, 'PUT', `/follows/creators/${creatorId}`)).status).toBe(200);
      expect(
        (
          await (
            await request(viewer, 'PUT', `/follows/creators/${creatorId.toUpperCase()}`)
          ).json()
        ).data.following,
      ).toBe(true);

      expect((await request(viewer, 'PUT', `/follows/creators/${creatorId}`)).status).toBe(200);
      expect(
        (await json(viewer, '/follows?kind=creators')).data.items.map(
          (item: { id: string }) => item.id,
        ),
      ).toEqual([creatorId]);
      expect(
        (await followService.statuses('creators', [creatorId], viewer))[creatorId].followerCount,
      ).toBe(1);
      // A new manager and slug do not change the followed identity.
      await db
        .update(creatorProfile)
        .set({ ownerId: stranger, slug: `renamed-${creatorId}` })
        .where(eq(creatorProfile.id, creatorId));
      expect((await followService.list('creators', viewer, 1)).items[0].slug).toBe(
        `renamed-${creatorId}`,
      );

      const contents = Array.from({ length: 6 }, () => crypto.randomUUID());
      await db.insert(creation).values(
        contents.map((id, i) => ({
          id,
          creatorId: i === 1 || i === 3 || i === 5 ? creatorId : i === 4 ? otherCreator : null,
          ownerUserId: i === 0 ? author : i === 2 ? stranger : null,
          authorId: author,
          draft: document,
          published: i === 3 ? null : document,
          publishedAt: new Date().toISOString(),
          publishedRevision: 1,
          ...(i === 5
            ? { sourceVideoId: 'expired-' + creatorId, sourceStatus: 'expired' as const }
            : {}),
        })),
      );
      expect((await request(null, 'GET', '/content/creations?following=true')).status).toBe(401);
      const feed = (await json(viewer, '/content/creations?following=true')).data;
      expect(feed.items.map((item: { id: string }) => item.id).sort()).toEqual(
        [contents[0], contents[1]].sort(),
      );
      expect(feed.languages).toEqual(['en']);
      expect(
        (await creatorService.discover({ page: 1, following: true }, otherViewer)).items,
      ).toEqual([]);
      expect(
        (await creatorService.discover({ page: 1, following: true, language: 'fr' }, viewer)).items,
      ).toEqual([]);
      expect(
        (await creatorService.discover({ page: 1, following: true, limit: 1 }, viewer)).hasMore,
      ).toBe(true);
      // Transferring a personal article does not implicitly subscribe to its new creator.
      await db
        .update(creation)
        .set({ creatorId: otherCreator, ownerUserId: null, ownershipRevision: 2 })
        .where(eq(creation.id, contents[0]));
      expect(
        (await creatorService.discover({ page: 1, following: true }, viewer)).items.map(
          item => item.id,
        ),
      ).toEqual([contents[1]]);
      await db.update(creation).set({ published: null }).where(eq(creation.id, contents[1]));
      expect((await creatorService.discover({ page: 1, following: true }, viewer)).items).toEqual(
        [],
      );

      await db.insert(deck).values(
        deckIds.map((id, i) => ({
          id,
          userId: i === 3 ? stranger : author,
          format: 1,
          public: i === 0 || i === 3 ? 1 : i === 1 ? 0 : 2,
          name: 'Follow deck',
        })),
      );
      await db.insert(deckInformation).values(deckIds.map(deckId => ({ deckId })));
      expect((await request(null, 'GET', '/decks?following=true')).status).toBe(401);
      expect(
        (await json(viewer, '/decks?following=true')).data.map(
          (item: { deck: { id: string } }) => item.deck.id,
        ),
      ).toEqual([deckIds[0]]);
      expect((await json(otherViewer, '/decks?following=true')).data).toEqual([]);
      expect((await json(viewer, '/decks?following=true&format=2')).data).toEqual([]);
      expect((await json(viewer, `/decks?following=true&userId=${stranger}`)).data).toEqual([]);
      expect((await request(viewer, 'DELETE', `/follows/users/${author}`)).status).toBe(200);
      expect((await request(viewer, 'DELETE', `/follows/users/${author}`)).status).toBe(200);
      expect((await json(viewer, '/decks?following=true')).data).toEqual([]);

      // Execute the actual dump cleanup block, including all FK dependencies, in a rollback.
      await followService.set('users', author, viewer, true);
      const sanitizer = await Bun.file('scripts/remote-dev/sql/001-core-data.sql').text();
      const cleanup = sanitizer.match(/DO \$creator_hub\$[\s\S]*?\$creator_hub\$;/)![0];
      const rollback = new Error('rollback follow sanitizer');
      await expect(
        db.transaction(async tx => {
          await tx.execute(sql.raw(cleanup));
          expect(await tx.select().from(userFollow)).toHaveLength(0);
          expect(await tx.select().from(creatorFollow)).toHaveLength(0);
          throw rollback;
        }),
      ).rejects.toThrow(rollback.message);
      expect((await followService.list('users', viewer, 1)).items).toHaveLength(1);
      await db.delete(creatorProfile).where(eq(creatorProfile.id, creatorId));
      expect((await followService.list('creators', viewer, 1)).items).toHaveLength(0);
      await db.delete(user).where(eq(user.id, viewer));
      expect(
        await db.select().from(userFollow).where(eq(userFollow.followerUserId, viewer)),
      ).toHaveLength(0);
    } finally {
      await db.delete(deckInformation).where(inArray(deckInformation.deckId, deckIds));
      await db.delete(deck).where(inArray(deck.id, deckIds));
      await db.delete(creatorProfile).where(inArray(creatorProfile.id, [creatorId, otherCreator]));
      await db.delete(user).where(inArray(user.id, users));
    }
  },
  30_000,
);
