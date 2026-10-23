import { expect, test } from 'bun:test';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, inArray } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { user } from '../../server/db/schema/auth-schema.ts';
import { creation, creatorMember, creatorProfile } from '../../server/db/schema/creator_hub.ts';
import { deck } from '../../server/db/schema/deck.ts';
import { deckCard } from '../../server/db/schema/deck_card.ts';
import { userFileStorage } from '../../server/db/schema/user_file.ts';
import { emptyPostDocument, postDocumentSchemas } from '../../shared/posts/content.ts';
import { creatorProfileSchema } from '../../shared/creators/contracts.ts';
import { MCP_RESOURCE_SCOPES } from '../../shared/mcp/config.ts';
import { createArticleRepository } from './repository.ts';
import { createArticleAssets } from './assets.ts';
import { createArticleTemplates } from './templates.ts';
import { createCreationsService } from '../../server/lib/creators/creations.ts';
import type { ArticleActor } from './receipts.ts';
import { articleDocument } from './content.ts';
import { tournament } from '../../server/db/schema/tournament.ts';
import { tournamentDeck } from '../../server/db/schema/tournament_deck.ts';
import { tournamentMatch } from '../../server/db/schema/tournament_match.ts';
import { meleeConnection } from '../../server/db/schema/melee_connection.ts';
import { userMeleeTournaments } from '../../server/db/schema/user_melee_tournaments.ts';

const enabled = process.env.SWUBASE_MCP_DB_TEST === '1';
test.skipIf(!enabled)(
  'restricted article client preserves ownership, revisions, publication, retries, templates and image quotas',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const admin = postgres(target.href, { max: 3 });
    const runtime = postgres(target.href, { max: 1 });
    const db = drizzle({ client: admin }),
      limited = drizzle({ client: runtime });
    const ids = [0, 1, 2].map(() => `mcp-article-${crypto.randomUUID()}`);
    const actor: ArticleActor = {
      userId: ids[0],
      clientId: crypto.randomUUID(),
      scopes: [...MCP_RESOURCE_SCOPES],
    };
    const foreign = { ...actor, userId: ids[1] },
      editor = { ...actor, userId: ids[2] };
    const role = `mcp_articles_${crypto.randomUUID().replaceAll('-', '')}`;
    const eventId = crypto.randomUUID();
    const creatorId = crypto.randomUUID(),
      deckId = crypto.randomUUID();
    const objects = new Map<string, Uint8Array>();
    let uploads = 0;
    let failUpload = false;
    let storageAvailable = true;
    const storage = {
      available: () => storageAvailable,
      publicUrl: (key: string) => `https://images.invalid/${key}`,
      async put(key: string, bytes: Uint8Array) {
        uploads++;
        objects.set(key, bytes);
        if (failUpload) throw new Error('fixture storage failure');
      },
      async remove(key: string) {
        objects.delete(key);
      },
    };
    try {
      await admin`create role ${admin(role)} nologin`;
      const grants = (await readFile(new URL('../deploy/grants.sql', import.meta.url), 'utf8'))
        .replaceAll('swubase_mcp', role)
        .replace(':"DBNAME"', `"${target.pathname.slice(1)}"`);
      await admin.unsafe(grants).simple();
      await runtime`set role ${runtime(role)}`;
      await db.insert(user).values(
        ids.map(id => ({
          id,
          name: 'Private legal name',
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      await db.insert(creatorProfile).values({
        id: creatorId,
        ownerId: actor.userId,
        slug: creatorId,
        profile: creatorProfileSchema.parse({
          slug: creatorId,
          name: 'Creator fixture',
          bio: emptyPostDocument(),
          languages: ['en'],
          specialties: [],
          links: [],
        }),
      });
      await db.insert(creatorMember).values({ creatorId, userId: editor.userId });
      const articles = createArticleRepository(limited),
        assets = createArticleAssets(limited, storage),
        templates = createArticleTemplates(limited, assets);
      const request = {
        requestId: crypto.randomUUID(),
        creatorId: null,
        fields: {
          title: 'Original',
          summary: 'Keep summary',
          language: 'fr',
          body: {
            version: 1 as const,
            blocks: [
              {
                id: 'intro',
                type: 'paragraph',
                content: [{ type: 'text', text: 'A private draft.' }],
              },
            ],
          },
        },
      };
      const first = await articles.create(actor, request);
      expect(await articles.create(actor, request)).toEqual(first);
      const unavailableCatalog = createArticleRepository(limited, async () => {
        throw new Error('Catalog unavailable');
      });
      expect(await unavailableCatalog.create(actor, request)).toEqual(first);
      await expect(
        articles.create(actor, { ...request, fields: { title: 'Different' } }),
      ).rejects.toMatchObject({ status: 409 });
      await expect(
        articles.get(foreign, { articleId: first.id, view: 'draft', format: 'native' }),
      ).rejects.toMatchObject({ status: 403 });
      expect((await articles.workspace(actor)).creators).toHaveLength(1);
      expect(
        (await articles.list(foreign, { state: 'all', limit: 10, offset: 0 })).articles,
      ).toHaveLength(0);
      const expected = {
        articleId: first.id,
        expectedRevision: first.revision,
        expectedOwnershipRevision: first.ownershipRevision,
      };
      await articles.publish(actor, {
        ...expected,
        requestId: crypto.randomUUID(),
        unpublish: false,
      });
      // Browser service edits the same article; an outdated MCP patch must fail.
      const [before] = await db.select().from(creation).where(eq(creation.id, first.id));
      const browserSave = await createCreationsService(db).save(
        null,
        actor.userId,
        { ...before.draft, title: 'Browser update' },
        first.id,
        1,
      );
      await expect(
        articles.update(actor, {
          ...expected,
          requestId: crypto.randomUUID(),
          fields: { title: 'Stale' },
        }),
      ).rejects.toMatchObject({ status: 409 });
      const update = {
        ...expected,
        expectedRevision: browserSave.revision,
        requestId: crypto.randomUUID(),
        fields: { title: 'MCP update' },
      };
      const updated = await articles.update(actor, update);
      expect(await articles.update(actor, update)).toEqual(updated);
      const draft = await articles.get(actor, {
        articleId: first.id,
        view: 'draft',
        format: 'native',
      });
      expect('document' in draft ? draft.document : undefined).toMatchObject({
        title: 'MCP update',
        summary: 'Keep summary',
        language: 'fr',
      });
      expect(
        await articles.get(actor, { articleId: first.id, view: 'published', format: 'native' }),
      ).toMatchObject({ document: { title: 'Original' } });
      expect((await articles.compare(actor, first.id, 1, 3)).changedFields).toEqual(['title']);
      const restored = await articles.update(actor, {
        ...expected,
        expectedRevision: updated.revision,
        requestId: crypto.randomUUID(),
        restoreRevision: 1,
      });
      expect(restored.revision).toBe(4);
      await articles.publish(actor, {
        ...expected,
        expectedRevision: 4,
        requestId: crypto.randomUUID(),
        unpublish: true,
      });
      expect((await articles.revisions(actor, first.id)).revisions).toHaveLength(4);
      const cloned = await articles.create(actor, {
        requestId: crypto.randomUUID(),
        creatorId,
        fields: {},
        duplicateArticleId: first.id,
      });
      expect(
        await articles.get(editor, { articleId: cloned.id, view: 'draft', format: 'native' }),
      ).toMatchObject({ document: { title: 'Original' } });
      const memberWrite = {
        articleId: cloned.id,
        expectedRevision: 1,
        expectedOwnershipRevision: 1,
        requestId: crypto.randomUUID(),
        fields: { summary: 'Member edit' },
      };
      await articles.update(editor, memberWrite);
      await db.delete(creatorMember).where(eq(creatorMember.userId, editor.userId));
      await expect(articles.update(editor, memberWrite)).rejects.toMatchObject({ status: 403 });
      await expect(articles.revisions(editor, cloned.id)).rejects.toMatchObject({ status: 403 });
      const preview = await articles.previewTransfer(actor, creatorId);
      await articles.create(actor, {
        requestId: crypto.randomUUID(),
        creatorId: null,
        fields: { title: 'After preview' },
      });
      await expect(
        articles.transfer(actor, {
          creatorId,
          requestId: crypto.randomUUID(),
          previewHash: preview.previewHash,
        }),
      ).rejects.toMatchObject({ status: 409 });
      const current = await articles.previewTransfer(actor, creatorId);
      const transfer = {
        creatorId,
        requestId: crypto.randomUUID(),
        previewHash: current.previewHash,
      };
      const moved = await articles.transfer(actor, transfer);
      expect(moved.moved).toBe(2);
      expect(await articles.transfer(actor, transfer)).toEqual(moved);
      await expect(
        articles.update(actor, {
          ...expected,
          expectedRevision: 4,
          requestId: crypto.randomUUID(),
          fields: { title: 'Old ownership' },
        }),
      ).rejects.toMatchObject({ status: 409 });
      await db.insert(deck).values({
        id: deckId,
        userId: actor.userId,
        name: 'Private guide deck',
        format: 1,
        public: 0,
        leaderCardId1: 'qui-gon-jinn--student-of-the-living-force',
        baseCardId: 'echo-base',
      });
      await db
        .insert(deckCard)
        .values({ deckId, cardId: 'coruscant-guard', board: 1, quantity: 3 });
      const templateInput = {
        blank: false,
        limitedFormat: 'Draft' as const,
        leaderIds: [],
        keyCardIds: [],
        archetypeKeys: [],
        deckKeys: [],
      };
      const prepared = await templates.prepare(actor, {
        ...templateInput,
        template: 'deck-guide',
        deckId,
      });
      expect(postDocumentSchemas.rich.safeParse(prepared.body).success).toBe(true);
      const invalidSubject = await articles.validate(actor, {
        fields: { title: 'Guide', body: prepared.body, references: prepared.references },
      });
      expect(invalidSubject.canPublish).toBe(false);
      expect(invalidSubject.widgetWarnings).not.toHaveLength(0);
      for (const template of [
        'deck-guide',
        'limited-guide',
        'meta-report',
        'tournament-report',
      ] as const) {
        const result = await templates.prepare(actor, { ...templateInput, template, blank: true });
        expect(postDocumentSchemas.rich.safeParse(result.body).success).toBe(true);
      }
      expect((await templates.tournaments(actor, false, 0, 10)).connected).toBe(false);
      await expect(templates.tournaments(actor, true, 0, 10)).rejects.toMatchObject({
        status: 409,
      });
      expect(
        (
          await assets.search(actor, {
            kind: 'deck',
            query: '',
            id: deckId,
            includeMine: false,
            limit: 10,
            offset: 0,
          })
        ).items,
      ).toHaveLength(0);
      expect(
        (
          await assets.search(actor, {
            kind: 'deck',
            query: '',
            id: deckId,
            includeMine: true,
            limit: 10,
            offset: 0,
          })
        ).items,
      ).toHaveLength(1);
      // Exercise all data-filled templates under the actual restricted grants.
      // Stored rounds keep this test independent of the external Melee service.
      await db.update(deck).set({ public: 1 }).where(eq(deck.id, deckId));
      const meleeId = Math.floor(1_800_000_000 + Math.random() * 100_000_000);
      await db.insert(tournament).values({
        id: eventId,
        userId: actor.userId,
        type: 'pq',
        location: 'Fixture',
        continent: 'Europe',
        name: 'MCP report fixture',
        attendance: 8,
        meleeId: String(meleeId),
        format: 1,
        days: 1,
        date: new Date('2026-10-10'),
        imported: true,
      });
      await db.insert(meleeConnection).values({
        userId: actor.userId,
        meleeUserId: crypto.randomUUID(),
        username: 'mcp-report-fixture',
        displayName: 'Fixture',
      });
      await db.insert(userMeleeTournaments).values({
        userId: actor.userId,
        tournamentId: eventId,
        meleeId,
        meleePlacement: 1,
        name: 'MCP report fixture',
        date: new Date('2026-10-10'),
        attendance: 8,
        record: '1-0-0',
        status: 4,
        refreshedAt: new Date(),
      });
      await db.insert(tournamentDeck).values({
        tournamentId: eventId,
        deckId,
        placement: 1,
        meleePlayerUsername: 'mcp-report-fixture',
        topRelativeToPlayerCount: true,
        recordWin: 1,
        recordLose: 0,
        recordDraw: 0,
        points: 3,
      });
      await db.insert(tournamentMatch).values({
        tournamentId: eventId,
        round: 1,
        p1Username: 'Fixture',
        p1DeckId: deckId,
        p1Points: 0,
        gameWin: 0,
        gameLose: 0,
        gameDraw: 0,
        result: 3,
        isBye: true,
      });
      expect((await templates.tournaments(actor, false, 0, 10)).tournaments).toHaveLength(1);
      for (const input of [
        { template: 'tournament-report' as const, tournamentId: eventId },
        { template: 'limited-guide' as const, set: 'sor' },
        { template: 'meta-report' as const, meta: { scope: 'tournament' as const, id: eventId } },
      ]) {
        const result = await templates.prepare(actor, { ...templateInput, ...input });
        expect(postDocumentSchemas.rich.safeParse(result.body).success).toBe(true);
        expect(result.sections.length).toBeGreaterThan(0);
      }
      const png = await sharp({
        create: { width: 16, height: 16, channels: 3, background: '#123456' },
      })
        .png()
        .toBuffer();
      const upload = {
        requestId: crypto.randomUUID(),
        fileName: 'fixture.png',
        mimeType: 'image/png',
        base64: png.toString('base64'),
        purpose: 'image' as const,
      };
      const image = await assets.upload(actor, upload);
      storageAvailable = false;
      expect(await assets.upload(actor, upload)).toEqual(image);
      storageAvailable = true;
      expect(uploads).toBe(2);
      expect((await assets.images(actor, 0)).files).toHaveLength(1);
      expect((await assets.images(foreign, 0)).files).toHaveLength(0);
      await db
        .update(userFileStorage)
        .set({ quotaBytes: 0 })
        .where(eq(userFileStorage.userId, actor.userId));
      await expect(
        assets.upload(actor, { ...upload, requestId: crypto.randomUUID() }),
      ).rejects.toMatchObject({ status: 409 });
      await db
        .update(userFileStorage)
        .set({ quotaBytes: 100000000 })
        .where(eq(userFileStorage.userId, actor.userId));
      failUpload = true;
      await expect(
        assets.upload(actor, { ...upload, requestId: crypto.randomUUID() }),
      ).rejects.toThrow();
      expect(objects.size).toBe(2);
      for (const query of [
        'select email from "user"',
        'update "user" set banned = true',
        'update user_file_storage set quota_bytes = 999999999',
        "insert into user_file_storage (user_id, quota_bytes) values ('invalid',999)",
        'select code from melee_verification',
      ]) {
        await expect(runtime.unsafe(query).execute()).rejects.toMatchObject({ code: '42501' });
      }
      expect(articleDocument({ title: 'Still editable', body: prepared.body }).body).toEqual(
        prepared.body,
      );
    } finally {
      await runtime`reset role`;
      await runtime.end();
      await db.delete(tournamentMatch).where(eq(tournamentMatch.tournamentId, eventId));
      await db.delete(tournamentDeck).where(eq(tournamentDeck.tournamentId, eventId));
      await db.delete(tournament).where(eq(tournament.id, eventId));
      await db.delete(deckCard).where(eq(deckCard.deckId, deckId));
      await db.delete(deck).where(eq(deck.id, deckId));
      await db.delete(user).where(inArray(user.id, ids));
      await admin`drop owned by ${admin(role)}`;
      await admin`drop role ${admin(role)}`;
      await admin.end();
    }
  },
  60000,
);
