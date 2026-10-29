import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { deck } from '../../db/schema/deck.ts';
import { creatorFollow } from '../../db/schema/follow.ts';
import {
  creation,
  creationRevision,
  creationTag,
  creationReference,
  creatorProfile,
  creatorMember,
  creatorChannel,
  creatorYoutube,
  creatorYoutubeChannel,
  creatorOauthState,
} from '../../db/schema/creator_hub.ts';
import { creatorVideoJob } from '../../db/schema/creator_video_job.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import { createCreatorHubRoute } from '../../routes/creator-hub.ts';
import { creatorService } from './service.ts';
import {
  creatorProfileSchema,
  creationDocumentSchema,
} from '../../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';

test.skipIf(process.env.CREATOR_HUB_DB_TEST !== '1')(
  'owner deletion preserves chosen articles and cleans up only the selected creator',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const owner = `delete-owner-${crypto.randomUUID()}`,
      editor = `delete-editor-${crypto.randomUUID()}`;
    const stranger = `delete-stranger-${crypto.randomUUID()}`;
    const ids = Array.from({ length: 4 }, () => crypto.randomUUID());
    const [creatorId, otherId, allId, emptyId] = ids;
    const channelId = `UC${crypto.randomUUID().replaceAll('-', '').slice(0, 22)}`;
    const videoId = crypto.randomUUID().replaceAll('-', '').slice(0, 11);
    const deckId = crypto.randomUUID();
    const document = (title: string, medium: 'article' | 'video' = 'article') =>
      creationDocumentSchema.parse({
        title,
        medium,
        body: emptyPostDocument(),
        language: 'en',
        tags: [],
        references: [],
        chapters: [],
        ...(medium === 'video' ? { sourceUrl: `https://www.youtube.com/watch?v=${videoId}` } : {}),
      });
    const profile = (id: string) =>
      creatorProfileSchema.parse({
        slug: `delete-${id}`,
        name: 'Deletion fixture',
        bio: emptyPostDocument(),
        languages: ['en'],
        specialties: [],
        links: [],
      });
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const id = c.req.header('x-fixture-user');
        c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
        await next();
      })
      .route('/', createCreatorHubRoute());
    const request = (id: string, method: string, viewer?: string, body?: unknown, origin = true) =>
      app.request(`/creators/${id}${method === 'GET' ? '/deletion' : ''}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(viewer ? { 'x-fixture-user': viewer } : {}),
          ...(origin ? { 'X-Requested-With': 'swubase' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    try {
      await db.insert(user).values(
        [owner, editor, stranger].map(id => ({
          id,
          name: id,
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      await db.insert(creatorProfile).values(
        ids.map(id => ({
          id,
          slug: profile(id).slug,
          profile: profile(id),
          ownerId: id === otherId ? stranger : owner,
        })),
      );
      await db.insert(creatorMember).values({ creatorId, userId: editor });
      await db.insert(creatorFollow).values({ creatorId, followerUserId: editor });
      await db
        .insert(deck)
        .values({ id: deckId, userId: owner, format: 1, name: 'Keep this deck', public: 2 });
      const [published, draft, otherAuthor, video, mixed, personal, unrelated] = await db
        .insert(creation)
        .values([
          {
            creatorId,
            authorId: owner,
            draft: document('Private newer text'),
            published: document('Published text'),
            revision: 2,
            publishedRevision: 1,
            ownershipRevision: 2,
            publishedAt: '2026-01-01T12:00:00Z',
            publicUpdatedAt: '2026-01-01T12:00:00Z',
          },
          { creatorId, authorId: owner, draft: document('My draft') },
          { creatorId, authorId: editor, draft: document('Editor draft') },
          {
            creatorId,
            authorId: owner,
            draft: document('Imported video', 'video'),
            published: document('Imported video', 'video'),
            publishedRevision: 1,
            publishedAt: '2026-01-01T12:00:00Z',
            sourceVideoId: videoId,
            sourceChannelId: channelId,
            sourceDataOrigin: 'oauth' as const,
          },
          {
            creatorId,
            authorId: owner,
            draft: document('Changed medium'),
            published: document('Old video', 'video'),
            publishedRevision: 1,
            publishedAt: '2026-01-01T12:00:00Z',
          },
          { ownerUserId: owner, authorId: owner, draft: document('Already personal') },
          { creatorId: otherId, authorId: stranger, draft: document('Unrelated creator') },
        ])
        .returning();
      await db.insert(creationRevision).values([
        { creationId: published.id, revision: 1, document: published.published! },
        { creationId: published.id, revision: 2, document: published.draft },
        { creationId: video.id, revision: 1, document: video.draft },
      ]);
      await db.insert(creationTag).values({ creationId: published.id, tagId: 'medium:article' });
      await db
        .insert(creationReference)
        .values({ creationId: published.id, entityType: 'set', entityId: 'SOR' });
      await db
        .insert(creatorYoutubeChannel)
        .values({ channelId, metadataOrigin: 'oauth', title: 'Private provider title' });
      await db.insert(creatorChannel).values({ creatorId, channelId, origin: 'oauth' });
      await db.insert(creatorYoutube).values({
        creatorId,
        channelId,
        accessToken: 'local-fixture',
        refreshToken: 'local-fixture',
        expiresAt: '2099-01-01T00:00:00Z',
      });
      await db.insert(creatorOauthState).values({
        hash: crypto.randomUUID(),
        creatorId,
        userId: owner,
        sessionId: 'fixture',
        verifier: 'fixture',
        expiresAt: '2099-01-01T00:00:00Z',
      });
      await db
        .insert(creatorVideoJob)
        .values({ creatorId, videoId, channelId, creationId: video.id });
      const preview = await creatorService.deletionPreview(creatorId, owner);
      expect(preview).toMatchObject({
        total: 5,
        drafts: 2,
        keepableArticles: 2,
        keepableDrafts: 1,
        channels: 1,
        editors: 1,
      });
      let input = { snapshot: preview.snapshot, confirmation: preview.slug, keepMyArticles: true };
      for (const method of ['GET', 'DELETE']) {
        expect(
          (await request(creatorId, method, undefined, method === 'DELETE' ? input : undefined))
            .status,
        ).toBe(401);
        for (const viewer of [editor, stranger])
          expect(
            (await request(creatorId, method, viewer, method === 'DELETE' ? input : undefined))
              .status,
          ).toBe(403);
      }
      expect((await request(creatorId, 'DELETE', owner, input, false)).status).toBe(403);
      expect(
        (await request(creatorId, 'DELETE', owner, { ...input, confirmation: 'wrong' })).status,
      ).toBe(400);
      expect(
        (await request(creatorId, 'DELETE', owner, { confirmation: preview.slug })).status,
      ).toBe(400);
      expect((await request('not-a-uuid', 'GET', owner)).status).toBe(400);
      // A new draft arriving after the dialog opens must force a new review.
      await creatorService.save(creatorId, owner, document('New while reviewing'));
      expect((await request(creatorId, 'DELETE', owner, input)).status).toBe(409);
      expect(
        await db.select().from(creatorProfile).where(eq(creatorProfile.id, creatorId)),
      ).toHaveLength(1);
      const latest = await creatorService.deletionPreview(creatorId, owner);
      input = { ...input, snapshot: latest.snapshot };
      await creatorService.saveProfile(
        owner,
        { ...profile(creatorId), name: 'Renamed while reviewing' },
        creatorId,
        1,
      );
      expect((await request(creatorId, 'DELETE', owner, input)).status).toBe(409);
      input = {
        ...input,
        snapshot: (await creatorService.deletionPreview(creatorId, owner)).snapshot,
      };
      const responses = await Promise.all([
        request(creatorId, 'DELETE', owner, input),
        request(creatorId, 'DELETE', owner, input),
      ]);
      expect(responses.map(response => response.status).sort()).toEqual([200, 404]);
      expect((await request(creatorId, 'GET', owner)).status).toBe(404);
      const preserved = (await db.select().from(creation).where(eq(creation.id, published.id)))[0];
      expect(preserved).toMatchObject({
        creatorId: null,
        ownerUserId: owner,
        authorId: owner,
        ownershipRevision: 3,
        revision: 2,
        publishedRevision: 1,
        draft: published.draft,
        published: published.published,
        publishedAt: published.publishedAt,
        publicUpdatedAt: published.publicUpdatedAt,
      });
      expect(
        await db
          .select()
          .from(creationRevision)
          .where(eq(creationRevision.creationId, published.id)),
      ).toHaveLength(2);
      expect(
        await db.select().from(creationTag).where(eq(creationTag.creationId, published.id)),
      ).toHaveLength(1);
      expect(
        await db
          .select()
          .from(creationReference)
          .where(eq(creationReference.creationId, published.id)),
      ).toHaveLength(1);
      expect((await creatorService.get(published.id)).document.title).toBe('Published text');
      expect((await creatorService.get(draft.id, owner, true)).creatorId).toBe(null);
      await expect(creatorService.get(draft.id)).rejects.toMatchObject({ status: 404 });
      await expect(creatorService.get(published.id, editor, true)).rejects.toMatchObject({
        status: 403,
      });
      await expect(
        creatorService.save(
          creatorId,
          owner,
          published.draft,
          published.id,
          2,
          undefined,
          undefined,
          'public',
          2,
        ),
      ).rejects.toMatchObject({ status: 409 });
      await expect(
        creatorService.save(
          creatorId,
          editor,
          published.draft,
          published.id,
          2,
          undefined,
          undefined,
          'public',
          2,
        ),
      ).rejects.toMatchObject({ status: 403 });
      await creatorService.save(
        null,
        owner,
        preserved.draft,
        preserved.id,
        2,
        undefined,
        undefined,
        'public',
        3,
      );
      expect(
        await db
          .select()
          .from(creation)
          .where(inArray(creation.id, [otherAuthor.id, video.id, mixed.id])),
      ).toHaveLength(0);
      expect(
        await db
          .select()
          .from(creation)
          .where(inArray(creation.id, [personal.id, unrelated.id])),
      ).toHaveLength(2);
      expect(
        await db.select().from(creatorMember).where(eq(creatorMember.creatorId, creatorId)),
      ).toHaveLength(0);
      expect(
        await db.select().from(creatorFollow).where(eq(creatorFollow.creatorId, creatorId)),
      ).toHaveLength(0);
      expect(
        await db.select().from(creatorChannel).where(eq(creatorChannel.creatorId, creatorId)),
      ).toHaveLength(0);
      expect(
        await db.select().from(creatorYoutube).where(eq(creatorYoutube.creatorId, creatorId)),
      ).toHaveLength(0);
      expect(
        await db.select().from(creatorOauthState).where(eq(creatorOauthState.creatorId, creatorId)),
      ).toHaveLength(0);
      expect(
        await db.select().from(creatorVideoJob).where(eq(creatorVideoJob.creatorId, creatorId)),
      ).toHaveLength(0);
      expect(
        (
          await db
            .select()
            .from(creatorYoutubeChannel)
            .where(eq(creatorYoutubeChannel.channelId, channelId))
        )[0].title,
      ).toBe('');
      expect(await db.select().from(deck).where(eq(deck.id, deckId))).toHaveLength(1);
      expect(await db.select().from(user).where(eq(user.id, owner))).toHaveLength(1);
      // Explicit deletion of all content, including an article eligible for preservation.
      await creatorService.save(allId, owner, document('Delete this too'));
      const all = await creatorService.deletionPreview(allId, owner);
      expect(
        (
          await request(allId, 'DELETE', owner, {
            snapshot: all.snapshot,
            confirmation: all.slug,
            keepMyArticles: false,
          })
        ).status,
      ).toBe(200);
      expect(await db.select().from(creation).where(eq(creation.creatorId, allId))).toHaveLength(0);
      const empty = await creatorService.deletionPreview(emptyId, owner);
      expect(empty.total).toBe(0);
      await creatorService.deleteProfile(emptyId, owner, {
        snapshot: empty.snapshot,
        confirmation: empty.slug,
        keepMyArticles: true,
      });
    } finally {
      await db.delete(deck).where(eq(deck.id, deckId));
      await db.delete(creatorProfile).where(inArray(creatorProfile.id, ids));
      await db.delete(creatorYoutubeChannel).where(eq(creatorYoutubeChannel.channelId, channelId));
      await db.delete(user).where(inArray(user.id, [owner, editor, stranger]));
    }
  },
  30_000,
);
