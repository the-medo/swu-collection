import { creatorMigrationSection } from './migration-fixture.ts';
import { expect, test } from 'bun:test';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { createCreatorService } from './service.ts';
import {
  creationDocumentSchema,
  creatorProfileSchema,
} from '../../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';
import { creationTags } from '../../../shared/creators/taxonomy.ts';

test.skipIf(process.env.CREATOR_HUB_DB_TEST !== '1')(
  'taxonomy migration preserves drafts/history; language facets respect the public area; subjects use current dates',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const client = postgres(target.toString(), { max: 1 });
    await client.unsafe('BEGIN');
    try {
      const tx = client;
      // Use a rollback transaction: legacy fixtures and the entire migration leave no changes.
      await tx.unsafe(
        (await creatorMigrationSection('creator_taxonomy')).replace(
          /;\s*$/,
          ' ON CONFLICT (id) DO NOTHING;',
        ),
      );
      const id = crypto.randomUUID(),
        itemId = crypto.randomUUID(),
        unpublishedId = crypto.randomUUID();
      const profile = creatorProfileSchema.parse({
        slug: `tax-${id}`,
        name: `Taxonomy ${id}`,
        languages: ['pt-BR'],
        specialties: [],
        links: [],
        bio: emptyPostDocument(),
      });
      profile.specialties = ['format:constructed', 'format:twin-suns', 'audience:intermediate'];
      const doc = creationDocumentSchema.parse({
        title: `Taxonomy ${id}`,
        medium: 'video',
        sourceUrl: 'https://youtu.be/abcdefghijk',
        body: emptyPostDocument(),
        tags: [],
        references: [],
        chapters: [],
      });
      const draft = {
        ...doc,
        tags: [
          'purpose:deck-tech',
          'purpose:deck-guide',
          'format:constructed',
          'format:twin-suns',
          'environment:karabast',
          'environment:webcam',
          'topic:mulligans',
          'topic:resourcing',
          'audience:intermediate',
        ],
      };
      const published = {
        ...doc,
        language: 'fr',
        tags: ['purpose:gameplay', 'format:limited', 'environment:webcam'],
      };
      await tx`INSERT INTO creator_profile (id, slug, profile) VALUES (${id}, ${profile.slug}, ${tx.json(profile)})`;
      await tx`INSERT INTO creation (id, creator_id, draft, published, revision, published_revision, published_at) VALUES (${itemId}, ${id}, ${tx.json(draft)}, ${tx.json(published)}, 2, 1, '2026-01-01')`;
      await tx`INSERT INTO creation (id, creator_id, draft) VALUES (${unpublishedId}, ${id}, ${tx.json({ ...doc, language: 'ja' })})`;
      await tx`INSERT INTO creation_revision (creation_id, revision, document) VALUES (${itemId}, 1, ${tx.json(published)}), (${itemId}, 2, ${tx.json(draft)})`;
      for (const tag of ['medium:video', ...published.tags])
        await tx`INSERT INTO creation_tag VALUES (${itemId}, ${tag})`;

      const migration = await creatorMigrationSection('creator_taxonomy_simplified');
      await tx.unsafe(migration);
      const [row] = await tx`SELECT * FROM creation WHERE id = ${itemId}`;
      expect(row.draft.tags).toEqual([
        'purpose:deck-guide',
        'format:premier',
        'format:eternal',
        'format:twin-suns',
        'environment:online',
        'topic:play-decisions',
        'audience:advanced',
      ]);
      expect(row.published.tags).toEqual([
        'purpose:gameplay',
        'format:draft',
        'format:sealed',
        'environment:online',
      ]);
      expect(row.revision).toBe(2);
      expect(row.published_revision).toBe(1);
      expect(row.published_at.toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(
        (await tx`SELECT published FROM creation WHERE id = ${unpublishedId}`)[0].published,
      ).toBeNull();
      const history =
        await tx`SELECT document FROM creation_revision WHERE creation_id = ${itemId} ORDER BY revision`;
      expect(history.map(r => r.document)).toEqual([row.published, row.draft]);
      expect(
        (await tx`SELECT profile FROM creator_profile WHERE id = ${id}`)[0].profile.specialties,
      ).toEqual(['format:premier', 'format:eternal', 'format:twin-suns', 'audience:advanced']);
      expect(
        (
          await tx`SELECT tag_id FROM creation_tag WHERE creation_id = ${itemId} ORDER BY tag_id`
        ).map(r => r.tag_id),
      ).toEqual([
        'environment:online',
        'format:draft',
        'format:sealed',
        'medium:video',
        'purpose:gameplay',
      ]);
      expect((await tx`SELECT id FROM creator_tag ORDER BY id`).map(r => r.id)).toEqual(
        creationTags.map(t => t.id).sort(),
      );
      await tx.unsafe(migration);
      expect((await tx`SELECT * FROM creation WHERE id = ${itemId}`)[0]).toEqual(row);

      const service = createCreatorService(drizzle(tx));
      // Pagination and the current language must not remove other available choices.
      expect(await service.discover({ creatorId: id, language: 'en', page: 2 })).toMatchObject({
        items: [],
        languages: ['fr'],
      });
      expect(
        (await service.discover({ creatorId: id, tags: 'purpose:deck-guide', page: 1 })).languages,
      ).toEqual([]);
      expect(
        (await service.discover({ creatorId: id, after: '2026-01-02', page: 1 })).languages,
      ).toEqual([]);
      expect(
        (await service.discover({ creatorId: id, tags: 'format:limited', page: 1 })).items,
      ).toHaveLength(1);
      expect(
        (await service.profiles(profile.name, 2, 'en', 'format:constructed')).languages,
      ).toEqual(['pt-BR']);
      expect(
        (await service.profiles(profile.name, 1, undefined, 'format:limited')).languages,
      ).toEqual([]);

      const [existingUser] = await tx`SELECT id FROM "user" LIMIT 1`;
      expect(existingUser).toBeDefined();
      const [major] = await tx`SELECT id FROM tournament_type WHERE major = 1 LIMIT 1`;
      const [local] = await tx`SELECT id FROM tournament_type WHERE major = 0 LIMIT 1`;
      const tournamentIds: string[] = [];
      for (const [offset, type] of [
        [-45, major.id],
        [-15, local.id],
        [0, local.id],
        [15, major.id],
        [15, local.id],
      ] as const) {
        const tournamentId = crypto.randomUUID();
        tournamentIds.push(tournamentId);
        await tx`INSERT INTO tournament (id,user_id,type,location,continent,name,attendance,format,days,date) VALUES (${tournamentId},${existingUser.id},${type},'fixture','fixture',${profile.name},1,1,1,CURRENT_DATE + ${offset}::int)`;
      }
      expect(new Set((await service.subjects('tournament', profile.name)).map(t => t.id))).toEqual(
        new Set([tournamentIds[1], tournamentIds[2], tournamentIds[3]]),
      );
      expect((await service.subjects('tournament', profile.name, 'authoring')).length).toBe(5);
      expect(
        (await service.discover({ creatorId: id, entityType: 'set', entityId: 'sor', page: 1 }))
          .subject,
      ).toEqual({ type: 'set', id: 'sor', label: 'Spark of Rebellion' });
      const sets = await service.subjects('set', '');
      expect(sets[0].id).toBe('hmw');
      expect(sets.at(-1)?.id).toBe('sor');
    } finally {
      await client.unsafe('ROLLBACK');
      await client.end();
    }
  },
);
