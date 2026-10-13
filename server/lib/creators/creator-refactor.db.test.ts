import { creatorMigrationSection } from './migration-fixture.ts';
import { expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { eligibleChannels } from './channels.ts';

const enabled = process.env.CREATOR_HUB_DB_TEST === '1';
function localDatabase() {
  const target = new URL(process.env.DATABASE_URL!);
  if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
    throw new Error('Use an isolated worktree database.');
}

test.skipIf(!enabled)(
  'channel backfill preserves credentials, curated trust, conflicts and handle expiry',
  async () => {
    localDatabase();
    const migration = await creatorMigrationSection('creator_channel_identity');
    const backfill = migration.slice(
      migration.indexOf('-- Preserve channel identity'),
      migration.indexOf('ALTER TABLE "creator_youtube" ADD CONSTRAINT'),
    );
    const rollback = new Error('rollback channel backfill');
    await expect(
      db.transaction(async tx => {
        // Temporary tables shadow only this connection; real creator records stay untouched.
        await tx.execute(
          sql.raw(`
      CREATE TEMP TABLE creator_profile (id uuid PRIMARY KEY, owner_id text, profile jsonb) ON COMMIT DROP;
      CREATE TEMP TABLE creator_youtube (channel_id text PRIMARY KEY, creator_id uuid, title text, connected_at timestamptz, access_token text) ON COMMIT DROP;
      CREATE TEMP TABLE creator_youtube_channel (channel_id text PRIMARY KEY, title text DEFAULT '', metadata_updated_at timestamptz, auto_import_enabled boolean DEFAULT true) ON COMMIT DROP;
      CREATE TEMP TABLE creator_channel (creator_id uuid, channel_id text, origin text, source_url text, resolved_at timestamptz, PRIMARY KEY (creator_id, channel_id)) ON COMMIT DROP;
      CREATE TEMP TABLE creator_channel_resolution (url text PRIMARY KEY, channel_id text, resolved_at timestamptz) ON COMMIT DROP;
    `),
        );
        const [curated, owned, duplicate] = [
          crypto.randomUUID(),
          crypto.randomUUID(),
          crypto.randomUUID(),
        ];
        const [direct, fresh, stale, authorized, spoof] = ['a', 'b', 'c', 'd', 'e'].map(
          c => `UC${c.repeat(22)}`,
        );
        const links = [
          `https://www.youtube.com/channel/${direct}/videos?view=0`,
          'https://youtube.com/@Fresh/videos',
          'https://www.youtube.com/@Stale',
          `https://youtube.com@evil.test/channel/${spoof}`,
          `https://youtube.com:3000/channel/${spoof}`,
        ].map(url => ({ url }));
        await tx.execute(sql`INSERT INTO creator_profile VALUES
      (${curated}, NULL, ${JSON.stringify({ links })}::jsonb),
      (${owned}, 'signed-in-user', ${JSON.stringify({ links: [{ url: `https://www.youtube.com/channel/${spoof}` }] })}::jsonb),
      (${duplicate}, NULL, ${JSON.stringify({ links: [{ url: `https://www.youtube.com/channel/${direct}` }] })}::jsonb)`);
        await tx.execute(sql`INSERT INTO creator_channel_resolution VALUES
      ('https://www.youtube.com/@Fresh', ${fresh}, now()),
      ('https://www.youtube.com/@Stale', ${stale}, now() - interval '2 days')`);
        await tx.execute(
          sql`INSERT INTO creator_youtube VALUES (${authorized}, ${owned}, 'Verified channel', now(), 'sealed-token')`,
        );
        await tx.execute(sql.raw(backfill));
        expect(
          Array.from(await tx.execute(sql`SELECT access_token, title FROM creator_youtube`)),
        ).toEqual([{ access_token: 'sealed-token', title: 'Verified channel' }]);
        expect(
          await tx.execute(sql`SELECT channel_id FROM creator_youtube_channel ORDER BY channel_id`),
        ).toHaveLength(4);
        const eligible = await eligibleChannels(tx);
        expect([...eligible.channels]).toEqual(
          expect.arrayContaining([
            [fresh, curated],
            [authorized, owned],
          ]),
        );
        expect(eligible.channels.size).toBe(2);
        expect(eligible.conflicts).toEqual([direct]);
        expect(eligible.channels.has(stale)).toBe(false);
        expect(eligible.channels.has(spoof)).toBe(false);
        // Assigning an owner never turns a curated link into a verified connection.
        await tx.execute(
          sql`UPDATE creator_profile SET owner_id = 'claimed' WHERE id = ${curated}`,
        );
        expect((await eligibleChannels(tx)).channels.has(fresh)).toBe(false);
        await tx.execute(sql`DELETE FROM creator_youtube WHERE channel_id = ${authorized}`);
        expect((await eligibleChannels(tx)).channels.has(authorized)).toBe(true);
        expect(
          Array.from(
            await tx.execute(
              sql`SELECT title FROM creator_youtube_channel WHERE channel_id = ${authorized}`,
            ),
          ),
        ).toEqual([{ title: 'Verified channel' }]);
        throw rollback;
      }),
    ).rejects.toThrow(rollback.message);
  },
);

test.skipIf(!enabled)(
  'description backfill preserves edited versions, revisions and publication state',
  async () => {
    localDatabase();
    const migration = await creatorMigrationSection('creator_video_descriptions');
    const repair = await creatorMigrationSection('creator_description_legacy_normalization');
    const rollback = new Error('rollback description backfill');
    await expect(
      db.transaction(async tx => {
        await tx.execute(
          sql.raw(`
      CREATE TEMP TABLE creation (id text PRIMARY KEY, source_video_id text, draft jsonb, published jsonb, revision int, published_revision int, published_at timestamptz) ON COMMIT DROP;
      CREATE TEMP TABLE creation_revision (creation_id text, revision int, document jsonb) ON COMMIT DROP;
      CREATE TEMP TABLE creator_video_job (video_id text PRIMARY KEY, metadata jsonb) ON COMMIT DROP;
    `),
        );
        const description = 'x'.repeat(1200) + '\n\nhttps://swuforge.com/decks/late-link\n';
        const original = { medium: 'video', summary: description.slice(0, 1000) };
        const edited = { medium: 'video', summary: 'Hand-edited version' };
        const manual = { medium: 'video', summary: 'Manual description\nwith breaks' };
        const retained = { ...original, videoDescription: 'Already migrated and edited' };
        await tx.execute(sql`INSERT INTO creation VALUES
      ('worker', 'abcdefghijk', ${JSON.stringify(edited)}::jsonb, ${JSON.stringify(original)}::jsonb, 2, 1, '2026-10-01T12:00:00Z'),
      ('manual', NULL, ${JSON.stringify(manual)}::jsonb, NULL, 1, NULL, NULL),
      ('retained', 'abcdefghijk', ${JSON.stringify(retained)}::jsonb, NULL, 3, NULL, NULL)`);
        await tx.execute(sql`INSERT INTO creation_revision VALUES
      ('worker', 1, ${JSON.stringify(original)}::jsonb), ('worker', 2, ${JSON.stringify(edited)}::jsonb)`);
        await tx.execute(
          sql`INSERT INTO creator_video_job VALUES ('abcdefghijk', ${JSON.stringify({ description })}::jsonb)`,
        );
        const legacyDescriptions = [
          '🔥' + 'x'.repeat(1200),
          '\n\t' + 'x'.repeat(1200),
          '\uFEFF\u00A0' + 'x'.repeat(1200),
          'x'.repeat(998) + '\n\n' + 'Full description after boundary whitespace.',
        ];
        for (const [index, value] of legacyDescriptions.entries()) {
          const id = `legacy-${index}`;
          const document = { medium: 'video', summary: value.slice(0, 1000).trim() };
          const shortened = { ...document, summary: value.slice(0, 30).trim() };
          await tx.execute(
            sql`INSERT INTO creator_video_job VALUES (${id}, ${JSON.stringify({ description: value })}::jsonb)`,
          );
          await tx.execute(sql`INSERT INTO creation VALUES
            (${id}, ${id}, ${JSON.stringify(document)}::jsonb, ${JSON.stringify(document)}::jsonb, 2, 1, '2026-10-01T12:00:00Z'),
            (${id + '-edited'}, ${id}, ${JSON.stringify(shortened)}::jsonb, NULL, 3, NULL, NULL)`);
          await tx.execute(
            sql`INSERT INTO creation_revision VALUES (${id}, 1, ${JSON.stringify(document)}::jsonb)`,
          );
        }
        const state = await tx.execute(
          sql`SELECT id, revision, published_revision, published_at FROM creation ORDER BY id`,
        );
        await tx.execute(sql.raw(migration));
        await tx.execute(sql.raw(repair));
        const rows = await tx.execute<{
          id: string;
          draft: { videoDescription?: string };
          published: { videoDescription?: string } | null;
        }>(sql`SELECT id, draft, published FROM creation ORDER BY id`);
        for (const [index, value] of legacyDescriptions.entries()) {
          const id = `legacy-${index}`;
          expect(rows.find(row => row.id === id)!.draft.videoDescription).toBe(value);
          expect(rows.find(row => row.id === id)!.published!.videoDescription).toBe(value);
          expect(rows.find(row => row.id === id + '-edited')!.draft.videoDescription).toBe(
            value.slice(0, 30).trim(),
          );
          const [revision] = await tx.execute(
            sql`SELECT document->>'videoDescription' AS description FROM creation_revision WHERE creation_id = ${id}`,
          );
          expect(revision.description).toBe(value);
        }
        expect(rows.find(r => r.id === 'worker')!.draft.videoDescription).toBe(edited.summary);
        expect(rows.find(r => r.id === 'worker')!.published!.videoDescription).toBe(description);
        expect(rows.find(r => r.id === 'manual')!.draft.videoDescription).toBe(manual.summary);
        expect(rows.find(r => r.id === 'manual')!.published).toBeNull();
        expect(rows.find(r => r.id === 'retained')!.draft).toEqual(retained);
        expect(
          Array.from(
            await tx.execute(
              sql`SELECT document->>'videoDescription' AS description FROM creation_revision WHERE creation_id = 'worker' ORDER BY revision`,
            ),
          ),
        ).toEqual([{ description }, { description: edited.summary }]);
        expect(
          await tx.execute(
            sql`SELECT id, revision, published_revision, published_at FROM creation ORDER BY id`,
          ),
        ).toEqual(state);
        await tx.execute(sql.raw(migration));
        await tx.execute(sql.raw(repair));
        expect(
          await tx.execute(sql`SELECT id, draft, published FROM creation ORDER BY id`),
        ).toEqual(rows);
        throw rollback;
      }),
    ).rejects.toThrow(rollback.message);
  },
);
