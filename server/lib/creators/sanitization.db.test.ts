import { expect, test } from 'bun:test';
import postgres from 'postgres';
import {
  creationDocumentSchema,
  creatorProfileSchema,
} from '../../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';

const enabled = process.env.CREATOR_SANITIZER_DB_TEST === '1';
const privateTables = [
  'creator_claimed_deck',
  'user_follow',
  'creator_follow',
  'creator_channel_resolution',
  'creator_publishing_request',
  'creation_report',
  'creator_video_job',
  'creator_video_spend',
  'creator_imported_deck',
  'creation_revision',
  'creator_member',
  'creator_oauth_state',
  'creator_youtube',
  'creator_channel',
  'creator_youtube_channel',
];
const source = await Bun.file('scripts/remote-dev/sql/001-core-data.sql').text();
const creatorBlock = source.match(/DO \$creator_hub\$[\s\S]*?\$creator_hub\$;/)![0];

async function rollbackTest(run: (tx: postgres.TransactionSql) => Promise<void>) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Use an isolated worktree database.');
  const connection = postgres(url.toString(), { max: 1 });
  const rollback = new Error('Intentional creator sanitizer rollback');
  try {
    await connection.begin(async tx => {
      await tx`SET LOCAL lock_timeout = '5s'`;
      await run(tx);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await connection.end();
  }
}

for (const beforeRanking of [false, true]) {
  test.skipIf(!enabled)(
    `full contributor sanitizer retains only public video snapshots (${beforeRanking ? 'before ranking migration' : 'current schema'})`,
    async () =>
      rollbackTest(async tx => {
        const marker = crypto.randomUUID();
        const owner = `sanitizer-${marker}`;
        const optedIn = `${owner}-opted-in`;
        const creatorId = crypto.randomUUID();
        const emptyProfile = crypto.randomUUID();
        const publicDeck = crypto.randomUUID();
        const privateDeck = crypto.randomUUID();
        const removedDeck = crypto.randomUUID();
        const optedInDeck = crypto.randomUUID();
        const channelId = 'UC' + marker.replaceAll('-', '').slice(0, 22);
        await tx`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency)
        VALUES ('swubase', 'System', 'sanitizer-system@invalid.local', false, now(), now(), 'System', 'USD')
        ON CONFLICT DO NOTHING`;
        for (const id of [owner, optedIn])
          await tx`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency)
          VALUES (${id}, 'Private account', ${id + '@invalid.local'}, false, now(), now(), ${id}, 'USD')`;
        await tx`INSERT INTO user_settings (user_id, key, value) VALUES (${optedIn}, 'share_development_data', 'true')`;
        for (const id of [publicDeck, privateDeck, removedDeck, optedInDeck])
          await tx`INSERT INTO deck (id, user_id, public, format, name)
          VALUES (${id}, ${id === removedDeck ? owner : id === optedInDeck ? optedIn : 'swubase'}, ${id === privateDeck ? 2 : 1}, 1, 'Reference fixture')`;
        const profile = creatorProfileSchema.parse({
          slug: `video-${marker}`,
          name: 'Public channel',
          bio: emptyPostDocument(),
          languages: ['en'],
          specialties: [],
          links: [],
        });
        for (const id of [creatorId, emptyProfile])
          await tx`INSERT INTO creator_profile (id, owner_id, slug, profile)
          VALUES (${id}, ${id === creatorId ? owner : optedIn}, ${id}, ${tx.json(profile)})`;
        const publicReference = { type: 'deck', id: publicDeck, startSeconds: 10 };
        const cardReference = { type: 'card', id: 'SOR_001', startSeconds: null };
        const optedInReference = { type: 'deck', id: optedInDeck, startSeconds: null };
        const document = creationDocumentSchema.parse({
          medium: 'video',
          title: 'Published video',
          summary: 'Public summary',
          body: emptyPostDocument(),
          sourceUrl: 'https://www.youtube.com/watch?v=publicVideo',
          coverUrl: 'https://example.com/video.jpg',
          language: 'en',
          tags: ['purpose:strategy'],
          references: [
            publicReference,
            cardReference,
            optedInReference,
            { type: 'deck', id: privateDeck },
            { type: 'deck', id: removedDeck },
            { type: 'deck', id: 'missing-deck' },
          ],
          chapters: [{ title: 'Public chapter', startSeconds: 0 }],
          durationSeconds: 500,
        });
        const draft = {
          ...document,
          title: 'PRIVATE DRAFT',
          summary: 'PRIVATE NOTES',
          references: [],
          tags: [],
        };
        const rows = [
          { label: 'public', keep: true },
          { label: 'manual', keep: true, manual: true, age: 365 },
          { label: 'legacy-active', keep: true, status: null },
          { label: 'draft', keep: false, unpublished: true },
          { label: 'article', keep: false, medium: 'article' },
          { label: 'audio', keep: false, medium: 'audio' },
          { label: 'external', keep: false, medium: 'external' },
          { label: 'expired', keep: false, age: 29 },
          { label: 'unavailable', keep: false, status: 'unavailable' },
          { label: 'revoked', keep: false, status: 'authorization_removed' },
          { label: 'oauth', keep: false, origin: 'oauth' },
          { label: 'unknown-origin', keep: false, origin: null },
          { label: 'missing-date', keep: false, missingDate: true },
        ];
        const kept: string[] = [];
        const inserted: string[] = [];
        for (const row of rows) {
          const id = crypto.randomUUID();
          inserted.push(id);
          if (row.keep) kept.push(id);
          const published = { ...document, medium: row.medium ?? 'video' };
          await tx`INSERT INTO creation
          (id, creator_id, author_id, draft, published, revision, published_revision,
           source_video_id, source_channel_id, source_data_origin, source_status, source_metadata_at,
           published_at, public_updated_at, manually_edited_fields, published_manually_edited_fields)
          VALUES (${id}, ${creatorId}, ${optedIn}, ${tx.json(draft)}, ${row.unpublished ? null : tx.json(published)}, 7, 3,
            ${row.manual ? null : marker + row.label}, ${row.manual ? null : channelId},
            ${row.origin === undefined ? 'public' : row.origin}, ${row.status === undefined ? 'active' : row.status},
            now() - (${row.age ?? 1} * interval '1 day'),
            ${row.unpublished || row.missingDate ? null : '2026-01-01T12:00:00Z'}, '2026-02-01T12:00:00Z',
            '["title", "summary"]'::jsonb, '["title"]'::jsonb)`;
          await tx`INSERT INTO creation_revision (creation_id, revision, document) VALUES (${id}, 7, ${tx.json(draft)})`;
        }
        // Private data still gets removed when its account explicitly opts in.
        await tx`INSERT INTO creation (creator_id, author_id, draft)
        VALUES (${emptyProfile}, ${optedIn}, ${tx.json(draft)})`;
        await tx`INSERT INTO creation (owner_user_id, author_id, draft, published, published_at)
        VALUES (${optedIn}, ${optedIn}, ${tx.json({ ...document, medium: 'article' })},
          ${tx.json({ ...document, medium: 'article' })}, now())`;
        await tx`INSERT INTO creator_member (creator_id, user_id) VALUES (${creatorId}, ${optedIn})`;
        await tx`INSERT INTO creator_youtube_channel (channel_id, title, metadata_origin)
        VALUES (${channelId}, 'PRIVATE OAUTH CHANNEL', 'oauth')`;
        await tx`INSERT INTO creator_channel (creator_id, channel_id, origin) VALUES (${creatorId}, ${channelId}, 'oauth')`;
        await tx`INSERT INTO creator_youtube (channel_id, creator_id, access_token, refresh_token, expires_at)
        VALUES (${channelId}, ${creatorId}, 'PRIVATE ACCESS TOKEN', 'PRIVATE REFRESH TOKEN', now())`;
        await tx`INSERT INTO creator_oauth_state (hash, creator_id, user_id, session_id, verifier, expires_at)
        VALUES (${marker}, ${creatorId}, ${optedIn}, 'PRIVATE SESSION', 'PRIVATE VERIFIER', now())`;
        await tx`INSERT INTO creator_follow (follower_user_id, creator_id) VALUES (${optedIn}, ${creatorId})`;
        await tx`INSERT INTO user_follow (follower_user_id, followed_user_id) VALUES (${optedIn}, ${owner})`;
        await tx`INSERT INTO creator_video_job (video_id, creator_id, channel_id, creation_id, metadata, last_error)
        VALUES (${marker}, ${creatorId}, ${channelId}, ${kept[0]!}, '{"secret":"PRIVATE METADATA"}', 'PRIVATE ERROR')`;
        await tx`INSERT INTO creator_video_spend (video_id, model, reserved_micros, usage)
        VALUES (${marker}, 'fixture', 1, '{"secret":"PRIVATE USAGE"}')`;
        await tx`INSERT INTO creator_publishing_request (id, user_id, creator_id, input_hash, moved)
        VALUES (${crypto.randomUUID()}, ${optedIn}, ${creatorId}, 'PRIVATE REQUEST', 1)`;
        await tx`INSERT INTO creation_report (creation_id, reporter_id, title, source_url, details)
        VALUES (${kept[0]!}, ${optedIn}, 'PRIVATE REPORT', ${document.sourceUrl}, 'PRIVATE DETAILS')`;
        await tx`INSERT INTO creator_channel_resolution (url, channel_id) VALUES (${document.sourceUrl}, ${channelId})`;
        await tx`INSERT INTO creator_imported_deck (user_id, source, source_deck_id, deck_id)
        VALUES (${optedIn}, 'fixture', ${marker}, ${publicDeck})`;
        await tx`INSERT INTO creator_claimed_deck (deck_id) VALUES (${publicDeck})`;

        if (beforeRanking) {
          // Recreate the pre-0096 boundary inside the rollback-only transaction.
          for (const trigger of await tx`SELECT tgname FROM pg_trigger WHERE tgrelid = 'creator_follow'::regclass AND NOT tgisinternal`)
            await tx`DROP TRIGGER ${tx(trigger.tgname)} ON creator_follow`;
          await tx`ALTER TABLE creator_profile DROP COLUMN follower_count`;
          await tx`ALTER TABLE creator_youtube_channel DROP COLUMN subscriber_count, DROP COLUMN subscribers_updated_at`;
        }
        for (const file of [
          '000-crossfire.sql',
          '001-core-data.sql',
          '002-teams-and-matches.sql',
        ]) {
          const script = await Bun.file(`scripts/remote-dev/sql/${file}`).text();
          await tx.unsafe(script.replace(/^(?:BEGIN|COMMIT);\s*$/gm, '')).simple();
        }
        const videos = await tx`SELECT * FROM creation WHERE id IN ${tx(inserted)} ORDER BY id`;
        expect(videos.map(row => row.id)).toEqual(kept.sort());
        for (const video of videos) {
          expect(video.published).toEqual({
            ...document,
            references: [publicReference, cardReference, optedInReference],
          });
          expect(video.draft).toEqual(video.published);
          expect(video.author_id).toBeNull();
          expect(video.revision).toBe(1);
          expect(video.published_revision).toBe(1);
          expect(video.manually_edited_fields).toEqual(['title']);
          expect(video.published_manually_edited_fields).toEqual(['title']);
          expect(video.published_at.toISOString()).toBe('2026-01-01T12:00:00.000Z');
          expect(video.updated_at.toISOString()).toBe('2026-02-01T12:00:00.000Z');
          expect(video.source_metadata_at.getTime()).toBeLessThan(Date.now() - 23 * 3600_000);
          expect(
            await tx`SELECT entity_id FROM creation_reference WHERE creation_id = ${video.id} ORDER BY entity_type, entity_id`,
          ).toEqual([
            { entity_id: 'SOR_001' },
            ...[publicDeck, optedInDeck].sort().map(entity_id => ({ entity_id })),
          ]);
          expect(
            (
              await tx`SELECT tag_id FROM creation_tag WHERE creation_id = ${video.id} ORDER BY tag_id`
            ).map(row => row.tag_id),
          ).toEqual(['medium:video', 'purpose:strategy']);
        }
        const [retainedProfile] = await tx`SELECT * FROM creator_profile WHERE id = ${creatorId}`;
        expect(retainedProfile!.profile).toEqual(profile);
        expect(retainedProfile!.owner_id).toBeNull();
        if (!beforeRanking) expect(retainedProfile!.follower_count).toBe(0);
        expect(await tx`SELECT id FROM creator_profile WHERE id = ${emptyProfile}`).toHaveLength(0);
        expect(await tx`SELECT id FROM "user" WHERE id = ${owner}`).toHaveLength(0);
        expect(await tx`SELECT id FROM deck WHERE id = ${removedDeck}`).toHaveLength(0);
        expect(await tx`SELECT id FROM "user" WHERE id = ${optedIn}`).toHaveLength(1);
        expect(await tx`SELECT id FROM creation WHERE owner_user_id IS NOT NULL`).toHaveLength(0);
        for (const table of privateTables)
          expect((await tx`SELECT count(*)::int AS count FROM ${tx(table)}`)[0]!.count).toBe(0);
        // Reapplying the creator cleanup preserves the same public snapshot.
        await tx.unsafe(creatorBlock).simple();
        expect(await tx`SELECT * FROM creation WHERE id IN ${tx(inserted)} ORDER BY id`).toEqual(
          videos,
        );
      }),
    30_000,
  );
}

test.skipIf(!enabled)(
  'pre-lifecycle backups remove creator data without assuming newer tables',
  async () => {
    await rollbackTest(async tx => {
      await tx`DROP TABLE creator_follow, user_follow, creator_publishing_request, creation_report`;
      await tx`ALTER TABLE creation DROP COLUMN source_data_origin`;
      await tx.unsafe(creatorBlock).simple();
      expect(await tx`SELECT id FROM creation`).toHaveLength(0);
      expect(await tx`SELECT id FROM creator_profile`).toHaveLength(0);
    });
  },
);
