import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { creation, creatorProfile } from '../../db/schema/creator_hub.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import { createCreatorHubRoute } from '../../routes/creator-hub.ts';
import { creatorService } from './service.ts';
import {
  creationDocumentSchema,
  creatorProfileSchema,
} from '../../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';

test.skipIf(process.env.CREATOR_HUB_DB_TEST !== '1')(
  'studio filters search the whole authorized library before pagination and preserve private scope',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const owner = `studio-owner-${crypto.randomUUID()}`;
    const stranger = `studio-stranger-${crypto.randomUUID()}`;
    const creatorId = crypto.randomUUID();
    const users = [owner, stranger];
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const id = c.req.header('x-fixture-user');
        c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
        await next();
      })
      .route('/', createCreatorHubRoute());
    const request = (path: string, viewer?: string) =>
      app.request(path, {
        headers: viewer ? { 'x-fixture-user': viewer } : {},
      });
    const doc = (title: string) =>
      creationDocumentSchema.parse({
        title,
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
          name: id,
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      const profile = creatorProfileSchema.parse({
        slug: `studio-${creatorId}`,
        name: 'Studio filters',
        bio: emptyPostDocument(),
        languages: ['en'],
        specialties: [],
        links: [],
      });
      await db
        .insert(creatorProfile)
        .values({ id: creatorId, slug: profile.slug, ownerId: owner, profile });
      // Older matching entries sit behind a full page of unrelated drafts.
      await db.insert(creation).values(
        Array.from({ length: 26 }, (_, i) => ({
          creatorId,
          authorId: owner,
          draft: doc(`Unrelated ${i}`),
          updatedAt: new Date().toISOString(),
        })),
      );
      const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
      await db.insert(creation).values(
        ids.map((id, index) => ({
          id,
          creatorId,
          authorId: owner,
          draft: doc(`Resource ${index} 100%_literal`),
          published: index === 0 ? null : doc('Original public title'),
          revision: index === 2 ? 2 : 1,
          publishedRevision: index === 0 ? null : 1,
          publishedAt: index === 0 ? null : '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        })),
      );
      await db.insert(creation).values([
        { ownerUserId: owner, authorId: owner, draft: doc('Personal resource') },
        { ownerUserId: stranger, authorId: stranger, draft: doc('Private stranger resource') },
      ]);
      expect((await creatorService.studio(creatorId, owner)).hasMore).toBe(true);
      const matching = await creatorService.studio(creatorId, owner, 1, { q: 'resource' });
      expect(matching.items.map(item => item.id).sort()).toEqual([...ids].sort());
      expect(matching.hasMore).toBe(false);
      expect(
        (await creatorService.studio(creatorId, owner, 1, { q: '%_literal' })).items,
      ).toHaveLength(3);
      expect(
        (await creatorService.studio(creatorId, owner, 1, { q: 'Original public title' })).items,
      ).toHaveLength(0);
      expect(
        (
          await creatorService.studio(creatorId, owner, 1, { status: 'draft', q: 'resource' })
        ).items.map(item => item.id),
      ).toEqual([ids[0]]);
      expect(
        (await creatorService.studio(creatorId, owner, 1, { status: 'published' })).items,
      ).toHaveLength(2);
      expect(
        (await creatorService.studio(creatorId, owner, 1, { status: 'changes' })).items.map(
          item => item.id,
        ),
      ).toEqual([ids[2]]);
      const personal = await request('/personal/articles?q=resource&status=draft', owner);
      expect(personal.status).toBe(200);
      expect(
        (await personal.json()).data.items.map(
          (item: { document: { title: string } }) => item.document.title,
        ),
      ).toEqual(['Personal resource']);
      const response = await request(
        `/creators/${creatorId}/studio?q=Resource&status=changes`,
        owner,
      );
      expect(response.status).toBe(200);
      expect((await response.json()).data.items.map((item: { id: string }) => item.id)).toEqual([
        ids[2],
      ]);
      expect((await request(`/creators/${creatorId}/studio?status=draft`, stranger)).status).toBe(
        403,
      );
      expect((await request('/personal/articles?q=resource')).status).toBe(401);
      expect((await request(`/creators/${creatorId}/studio?status=anything`, owner)).status).toBe(
        400,
      );
      expect((await request('/personal/articles?page=0', owner)).status).toBe(400);
      expect((await request(`/personal/articles?q=${'x'.repeat(121)}`, owner)).status).toBe(400);
      const videoId = crypto.randomUUID();
      await db
        .insert(creation)
        .values({
          id: videoId,
          creatorId,
          authorId: owner,
          draft: creationDocumentSchema.parse({
            ...doc('An older video'),
            medium: 'video',
            sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
          }),
          updatedAt: '2025-01-01T00:00:00.000Z',
        });
      const videos = await request(
        `/creators/${creatorId}/studio?medium=video&status=draft`,
        owner,
      );
      expect(videos.status).toBe(200);
      const videoPage = (await videos.json()).data;
      expect(videoPage.items.map((item: { id: string }) => item.id)).toEqual([videoId]);
      expect(videoPage.hasMore).toBe(false);
      const articles = await creatorService.studio(creatorId, owner, 2, { medium: 'article' });
      expect(articles.items.every(item => item.document.medium === 'article')).toBe(true);
      expect(articles.items).toHaveLength(5);
      expect(
        (await creatorService.studio(creatorId, owner, 1, { medium: 'video', q: 'missing' })).items,
      ).toHaveLength(0);
      expect((await creatorService.studio(null, owner, 1, { medium: 'video' })).items).toHaveLength(
        0,
      );
      expect((await request(`/creators/${creatorId}/studio?medium=video`, stranger)).status).toBe(
        403,
      );
      expect((await request(`/creators/${creatorId}/studio?medium=video`)).status).toBe(401);
      expect((await request(`/creators/${creatorId}/studio?medium=anything`, owner)).status).toBe(
        400,
      );
    } finally {
      await db.delete(creation).where(inArray(creation.authorId, users));
      await db.delete(creatorProfile).where(eq(creatorProfile.id, creatorId));
      await db.delete(user).where(inArray(user.id, users));
    }
  },
);
