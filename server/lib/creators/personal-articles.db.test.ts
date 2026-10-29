import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { creation, creatorProfile, creatorPublishingRequest } from '../../db/schema/creator_hub.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import { createCreatorHubRoute } from '../../routes/creator-hub.ts';
import { creatorService } from './service.ts';
import {
  creationDocumentSchema,
  creatorProfileSchema,
} from '../../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';

test.skipIf(process.env.CREATOR_HUB_DB_TEST !== '1')(
  'personal publishing, atomic onboarding, claimed-profile transfer, retries and concurrent ownership changes',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const owner = `article-owner-${crypto.randomUUID()}`;
    const editor = `article-editor-${crypto.randomUUID()}`;
    const stranger = `article-stranger-${crypto.randomUUID()}`;
    const users = [owner, editor, stranger];
    const directoryId = crypto.randomUUID();
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const id = c.req.header('x-fixture-user');
        c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
        await next();
      })
      .route('/', createCreatorHubRoute());
    const request = (who: string | null, method: string, path: string, body?: unknown) =>
      app.request(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'swubase',
          ...(who ? { 'x-fixture-user': who } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    const body = emptyPostDocument();
    body.blocks[0] = {
      ...body.blocks[0],
      content: [{ type: 'text', text: 'A personal strategy article.', styles: {} }],
    };
    const doc = creationDocumentSchema.parse({
      title: 'Personal strategy',
      medium: 'article',
      body,
      language: 'en',
      tags: ['purpose:strategy'],
      references: [],
      chapters: [],
    });
    const profile = creatorProfileSchema.parse({
      slug: `articles-${crypto.randomUUID()}`,
      name: 'Article studio',
      bio: emptyPostDocument(),
      languages: ['en'],
      specialties: [],
      links: [],
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
      expect(
        (await request(null, 'POST', '/creations', { creatorId: null, document: doc })).status,
      ).toBe(401);
      expect((await request(null, 'GET', '/personal/articles')).status).toBe(401);
      expect((await request(null, 'GET', '/personal/counts')).status).toBe(401);
      expect(
        (
          await request(owner, 'POST', '/creations', {
            creatorId: null,
            document: {
              ...doc,
              medium: 'video',
              sourceUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
            },
          })
        ).status,
      ).toBe(400);
      const response = await request(owner, 'POST', '/creations', {
        creatorId: null,
        document: doc,
      });
      expect(response.status).toBe(201);
      const saved = (await response.json()).data;
      const draft = await creatorService.save(null, owner, { ...doc, title: 'Private draft' });
      expect((await request(null, 'GET', `/creations/${saved.id}`)).status).toBe(404);
      expect((await request(stranger, 'GET', `/creations/${saved.id}/draft`)).status).toBe(403);
      expect((await request(stranger, 'GET', `/creations/${saved.id}/revisions`)).status).toBe(403);
      expect(
        (
          await request(stranger, 'PUT', `/creations/${saved.id}`, {
            creatorId: null,
            document: doc,
            revision: 1,
          })
        ).status,
      ).toBe(403);
      expect(
        (await request(stranger, 'POST', `/creations/${saved.id}/publish`, { revision: 1 })).status,
      ).toBe(403);
      expect((await creatorService.studio(null, stranger)).items).toHaveLength(0);
      expect(await creatorService.personalCounts(owner)).toEqual({ total: 2, drafts: 2 });
      expect(
        (await request(owner, 'POST', `/creations/${saved.id}/publish`, { revision: 1 })).status,
      ).toBe(200);
      const publicBefore = await creatorService.get(saved.id);
      expect(publicBefore.creator).toBeNull();
      expect(publicBefore.author?.name).toBe(owner);
      expect(JSON.stringify(publicBefore)).not.toContain('PRIVATE LEGAL NAME');
      expect(JSON.stringify(publicBefore)).not.toContain('@invalid.local');
      expect(
        (await creatorService.discover({ page: 1 })).items.some(item => item.id === saved.id),
      ).toBe(true);
      // A newer draft must not be published by transferring the article.
      await creatorService.save(
        null,
        owner,
        { ...doc, title: 'Unpublished revision' },
        saved.id,
        1,
      );
      const history = await creatorService.revisions(saved.id, owner);
      const [before] = await db.select().from(creation).where(eq(creation.id, saved.id));
      const onboarding = {
        requestId: crypto.randomUUID(),
        profile,
        transferPersonalArticles: true,
      };
      const results = await Promise.all([
        creatorService.onboard(owner, onboarding),
        creatorService.onboard(owner, onboarding),
      ]);
      expect(results[0]).toEqual(results[1]);
      const created = results[0];
      expect(created.moved).toBe(2);
      const [after] = await db.select().from(creation).where(eq(creation.id, saved.id));
      expect(after).toEqual({
        ...before,
        creatorId: created.id,
        ownerUserId: null,
        ownershipRevision: 2,
      });
      expect(await creatorService.revisions(saved.id, owner)).toEqual(history);
      expect((await creatorService.get(saved.id)).document).toEqual(publicBefore.document);
      expect((await creatorService.get(saved.id)).author).toEqual(publicBefore.author);
      expect((await request(null, 'GET', `/creations/${draft.id}`)).status).toBe(404);
      expect((await creatorService.studio(created.id, owner)).items).toHaveLength(2);
      expect(await creatorService.personalCounts(owner)).toEqual({ total: 0, drafts: 0 });
      // Stale personal saves AND publishes cannot cross the ownership change.
      expect(
        (
          await request(owner, 'PUT', `/creations/${saved.id}`, {
            creatorId: null,
            document: doc,
            revision: 2,
          })
        ).status,
      ).toBe(409);
      expect(
        (await request(owner, 'POST', `/creations/${saved.id}/publish`, { revision: 2 })).status,
      ).toBe(409);
      await creatorService.setMember(created.id, owner, editor, false);
      expect(
        (
          await request(editor, 'PUT', `/creations/${saved.id}`, {
            creatorId: created.id,
            ownershipRevision: 2,
            document: doc,
            revision: 2,
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await request(editor, 'POST', `/creations/${saved.id}/publish`, {
            revision: 3,
            ownershipRevision: 2,
          })
        ).status,
      ).toBe(200);
      // Creating a creator never removes the ability to publish personally.
      const later = await creatorService.save(null, owner, doc);
      expect((await creatorService.onboard(owner, onboarding)).moved).toBe(2);
      expect((await creatorService.get(later.id, owner, true)).creatorId).toBeNull();
      expect((await request(stranger, 'POST', '/creators/onboard', onboarding)).status).toBe(409);
      expect(
        (
          await request(owner, 'POST', '/creators/onboard', {
            ...onboarding,
            transferPersonalArticles: false,
          })
        ).status,
      ).toBe(409);
      // Directory claim is an ownership assignment; it neither duplicates a profile nor moves articles.
      await db
        .insert(creatorProfile)
        .values({ id: directoryId, slug: `claimed-${crypto.randomUUID()}`, profile });
      const transferId = crypto.randomUUID();
      expect(
        (
          await request(owner, 'POST', `/creators/${directoryId}/transfer-articles`, {
            requestId: transferId,
          })
        ).status,
      ).toBe(403);
      await db
        .update(creatorProfile)
        .set({ ownerId: owner })
        .where(eq(creatorProfile.id, directoryId));
      expect((await creatorService.get(later.id, owner, true)).creatorId).toBeNull();
      await creatorService.setMember(directoryId, owner, editor, false);
      const editorArticle = await creatorService.save(null, editor, doc);
      expect(
        (
          await request(editor, 'POST', `/creators/${directoryId}/transfer-articles`, {
            requestId: crypto.randomUUID(),
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await request(owner, 'POST', `/creators/${directoryId}/transfer-articles`, {
            requestId: transferId,
          })
        ).status,
      ).toBe(200);
      expect((await creatorService.get(later.id, owner, true)).creatorId).toBe(directoryId);
      expect((await creatorService.get(editorArticle.id, editor, true)).creatorId).toBeNull();
      expect((await creatorService.get(saved.id)).creatorId).toBe(created.id);
      const newest = await creatorService.save(null, owner, doc);
      await creatorService.transferArticles(owner, directoryId, transferId);
      expect((await creatorService.get(newest.id, owner, true)).creatorId).toBeNull();
      // Concurrent autosave/transfer either saves before the move or reports a conflict.
      const [saveRace, moveRace] = await Promise.allSettled([
        creatorService.save(null, owner, { ...doc, title: 'Concurrent edit' }, newest.id, 1),
        creatorService.transferArticles(owner, directoryId, crypto.randomUUID()),
      ]);
      expect(moveRace.status).toBe('fulfilled');
      if (saveRace.status === 'rejected') expect(saveRace.reason.status).toBe(409);
      const raced = await creatorService.get(newest.id, owner, true);
      expect(raced.creatorId).toBe(directoryId);
      expect(raced.ownershipRevision).toBe(2);
      // Opting out leaves all personal drafts alone; duplicate slugs roll back the move.
      const untouched = await creatorService.save(null, owner, doc);
      await creatorService.onboard(owner, {
        requestId: crypto.randomUUID(),
        profile: { ...profile, slug: `empty-${crypto.randomUUID()}` },
        transferPersonalArticles: false,
      });
      expect(
        (
          await request(owner, 'POST', '/creators/onboard', {
            ...onboarding,
            requestId: crypto.randomUUID(),
          })
        ).status,
      ).toBe(409);
      expect((await creatorService.get(untouched.id, owner, true)).creatorId).toBeNull();
      // Only current ownership grants editing, even when the original author remains.
      await creatorService.setMember(directoryId, owner, editor, true);
      await db
        .update(creatorProfile)
        .set({ ownerId: stranger })
        .where(eq(creatorProfile.id, directoryId));
      expect((await request(owner, 'GET', `/creations/${later.id}/draft`)).status).toBe(403);
      expect(
        (
          await request(owner, 'POST', `/creators/${directoryId}/transfer-articles`, {
            requestId: transferId,
          })
        ).status,
      ).toBe(403);
      // Creator writes reference the same user through author_id. Their FK locks must not
      // deadlock with a transfer that locks the personal owner before the creator profile.
      await Promise.all(
        Array.from({ length: 6 }, () =>
          Promise.all([
            creatorService.save(created.id, owner, doc),
            creatorService.transferArticles(owner, created.id, crypto.randomUUID()),
          ]),
        ),
      );
      // Existing creator-native articles (and imports with the same ownership shape)
      // must not gain a new public personal byline.
      const native = await creatorService.save(created.id, owner, doc);
      await creatorService.publish(native.id, owner, native.revision);
      expect((await creatorService.get(native.id)).author).toBeNull();
      expect(
        (await creatorService.discover({ creatorId: created.id, page: 1 })).items.find(
          item => item.id === native.id,
        )?.author,
      ).toBeNull();
      // Personal data and request receipts must be removed from contributor dumps together.
      const sanitize = await Bun.file(
        new URL('../../../scripts/remote-dev/sql/001-core-data.sql', import.meta.url),
      ).text();
      await db
        .transaction(async tx => {
          await tx.execute(
            sql.raw(sanitize.match(/DO \$creator_hub\$[\s\S]*?\$creator_hub\$;/)![0]),
          );
          expect(
            await tx
              .select()
              .from(creation)
              .where(sql`${creation.published}->>'medium' IS DISTINCT FROM 'video'`),
          ).toHaveLength(0);
          expect(await tx.select().from(creatorPublishingRequest)).toHaveLength(0);
          throw new Error('rollback sanitizer assertion');
        })
        .catch(error => {
          if (error.message !== 'rollback sanitizer assertion') throw error;
        });
      // Account deletion deletes personal content, while author deletion retains another creator's content.
      const deletionFixture = await creatorService.save(null, owner, doc);
      await db.delete(user).where(eq(user.id, owner));
      expect(
        await db.select().from(creation).where(eq(creation.id, deletionFixture.id)),
      ).toHaveLength(0);
      expect((await creatorService.get(later.id, stranger, true)).author).toBeNull();
    } finally {
      await db.delete(creatorProfile).where(eq(creatorProfile.id, directoryId));
      await db.delete(user).where(inArray(user.id, users));
    }
  },
  30_000,
);
