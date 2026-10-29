import { expect, test } from 'bun:test';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { createCreatorService } from './service.ts';
import { createCreatorHubRoute } from '../../routes/creator-hub.ts';
import {
  creationDocumentSchema,
  creatorProfileSchema,
} from '../../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';

test.skipIf(process.env.CREATOR_HUB_DB_TEST !== '1')(
  'creator browsing counts all eligible publications and paginates distinct public decks',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const sql = postgres(target.toString(), { max: 1 });
    await sql.unsafe('BEGIN');
    try {
      const id = crypto.randomUUID();
      const profile = creatorProfileSchema.parse({
        slug: `browse-${id}`,
        name: `Browsing fixture ${id}`,
        languages: ['en-US', 'en-CA', 'fr'],
        specialties: [],
        links: [],
        bio: emptyPostDocument(),
      });
      await sql`INSERT INTO creator_profile (id, slug, profile) VALUES (${id}, ${profile.slug}, ${sql.json(profile)})`;
      const addCreation = async (
        medium: 'video' | 'article' | 'audio',
        language: string,
        tag: string,
        state = 'public',
      ) => {
        const creationId = crypto.randomUUID();
        const doc = creationDocumentSchema.parse({
          title: `Browsing ${creationId}`,
          medium,
          language,
          sourceUrl: medium === 'article' ? '' : 'https://youtu.be/abcdefghijk',
          body: emptyPostDocument(),
          tags: [tag],
          references: [],
          chapters: [],
        });
        await sql`INSERT INTO creation (id, creator_id, draft, published, published_revision, published_at, source_video_id, source_metadata_at) VALUES (${creationId}, ${id}, ${sql.json(doc)}, ${state === 'draft' ? null : sql.json(doc)}, ${state === 'draft' ? null : 1}, '2026-10-01', ${state === 'expired' ? 'abcdefghijk' : null}, now() - interval '90 days')`;
        for (const tagId of [`medium:${medium}`, tag])
          await sql`INSERT INTO creation_tag (creation_id, tag_id) VALUES (${creationId}, ${tagId})`;
        return creationId;
      };
      const first = await addCreation('video', 'en-US', 'purpose:meta-report');
      const second = await addCreation('video', 'en-GB', 'purpose:meta-report');
      await sql`UPDATE creation SET published = jsonb_set(published, '{durationSeconds}', '754'::jsonb) WHERE id = ${first}`;
      const sourceVideoId = id.replaceAll('-', '').slice(0, 11);
      await sql`UPDATE creation SET source_video_id = ${sourceVideoId}, source_metadata_at = now(), source_status = 'active' WHERE id = ${second}`;
      await sql`INSERT INTO creator_video_job (video_id, creator_id, channel_id, metadata, metadata_fetched_at)
        VALUES (${sourceVideoId}, ${id}, 'UCabcdefghijklmnopqrstuv', ${sql.json({ durationSeconds: 3920 })}, now())`;
      await addCreation('video', 'fr', 'purpose:gameplay');
      await addCreation('article', 'en', 'purpose:meta-report');
      const draft = await addCreation('video', 'en', 'purpose:meta-report', 'draft');
      const expired = await addCreation('video', 'en', 'purpose:meta-report', 'expired');
      const unavailable = await addCreation('video', 'en', 'purpose:meta-report');
      await sql`UPDATE creation SET source_video_id = 'unavailable', source_metadata_at = now(), source_status = 'unavailable' WHERE id = ${unavailable}`;
      const podcast = await addCreation('audio', 'en', 'purpose:gameplay');
      const service = createCreatorService(drizzle(sql));
      expect(await service.sectionCounts(id)).toEqual({
        videos: 3,
        articles: 1,
        podcasts: 1,
        decks: 0,
        series: 0,
      });
      const firstPage = await service.discover({
        creatorId: id,
        page: 1,
        limit: 1,
        tags: 'medium:video',
      });
      expect(firstPage.items).toHaveLength(1);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.languages).toEqual(['en', 'fr']);
      expect(firstPage.tagCounts).toContainEqual({ id: 'purpose:meta-report', count: 2 });
      expect(firstPage.tagCounts).toContainEqual({ id: 'purpose:gameplay', count: 1 });
      const nextPage = await service.discover({
        creatorId: id,
        page: 2,
        limit: 1,
        tags: 'medium:video',
      });
      expect(nextPage.items[0].id).not.toBe(firstPage.items[0].id);
      expect(nextPage.tagCounts).toEqual(firstPage.tagCounts);
      const filtered = await service.discover({
        creatorId: id,
        page: 1,
        tags: 'medium:video,purpose:meta-report',
        language: 'en',
      });
      expect(filtered.items).toHaveLength(2);
      const route = createCreatorHubRoute(service);
      const regionalContent = await route.request(
        `/creations?creatorId=${id}&language=en-CA&tags=medium:video`,
      );
      expect(regionalContent.status).toBe(200);
      const regionalResults = (await regionalContent.json()).data;
      expect(new Set(regionalResults.items.map((item: { id: string }) => item.id))).toEqual(
        new Set([first, second]),
      );
      expect(regionalResults.languages).toEqual(['en', 'fr']);
      const regionalDirectory = await route.request(
        `/creators?q=${encodeURIComponent(profile.name)}&language=en-GB`,
      );
      expect(regionalDirectory.status).toBe(200);
      const directoryResults = (await regionalDirectory.json()).data;
      expect(directoryResults.items.map((item: { id: string }) => item.id)).toEqual([id]);
      expect(directoryResults.languages).toEqual(['en', 'fr']);
      // Browsing leaves the original imported metadata intact.
      expect(directoryResults.items[0].languages).toEqual(['en-US', 'en-CA', 'fr']);
      expect(filtered.items.find(item => item.id === first)?.document.language).toBe('en-US');
      expect(filtered.items.find(item => item.id === first)?.document.durationSeconds).toBe(754);
      expect(filtered.items.find(item => item.id === second)?.document.durationSeconds).toBe(3920);
      await sql`UPDATE creator_video_job SET metadata_fetched_at = now() - interval '29 days' WHERE video_id = ${sourceVideoId}`;
      expect(
        (await service.discover({ creatorId: id, page: 1 })).items.find(item => item.id === second)
          ?.document.durationSeconds,
      ).toBeNull();
      await sql`UPDATE creator_video_job SET metadata_fetched_at = now() WHERE video_id = ${sourceVideoId}`;
      expect(filtered.tagCounts).toContainEqual({ id: 'purpose:meta-report', count: 2 });
      expect(filtered.tagCounts.some(tag => tag.id === 'purpose:gameplay')).toBe(false);
      expect((await service.discover({ page: 1, q: `Browsing ${first}` })).tagCounts).toEqual([]);
      const tagSelected = await service.discover({
        creatorId: id,
        page: 1,
        tags: 'medium:video,purpose:meta-report',
      });
      expect(tagSelected.items).toHaveLength(2);
      expect(tagSelected.tagCounts).toContainEqual({ id: 'purpose:gameplay', count: 1 });
      expect((await service.discover({ creatorId: id, page: 1, q: 'no match' })).tagCounts).toEqual(
        [],
      );
      await sql`UPDATE creation SET published = jsonb_set(published, '{series}', '"Shared series"'::jsonb) WHERE id IN (${first}, ${second})`;
      await sql`UPDATE creation SET published = jsonb_set(published, '{series}', '"Podcast series"'::jsonb) WHERE id = ${podcast}`;
      await sql`UPDATE creation SET draft = jsonb_set(draft, '{series}', '"Draft only"'::jsonb) WHERE id = ${draft}`;
      await sql`UPDATE creation SET published = jsonb_set(published, '{series}', '"Hidden series"'::jsonb) WHERE id IN (${expired}, ${unavailable})`;

      const ownerId = crypto.randomUUID();
      await sql`INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, display_name, currency)
        VALUES (${ownerId}, 'Creator browsing fixture', ${`browse-${ownerId}@example.invalid`}, true, now(), now(), ${`browse-${ownerId}`}, 'EUR')`;
      const visible: string[] = [];
      for (let n = 0; n < 18; n++) {
        const deckId = crypto.randomUUID();
        const visibility = n === 15 ? 0 : n === 16 ? 2 : 1;
        await sql`INSERT INTO deck (id, user_id, name, format, public, updated_at) VALUES (${deckId}, ${ownerId}, ${`Creator deck ${n}`}, 1, ${visibility}, now() - ${n} * interval '1 day')`;
        await sql`INSERT INTO creation_reference (creation_id, entity_type, entity_id) VALUES (${n === 17 ? draft : first}, 'deck', ${deckId})`;
        if (n < 15) {
          visible.push(deckId);
          await sql`INSERT INTO creation_reference (creation_id, entity_type, entity_id) VALUES (${second}, 'deck', ${deckId})`;
        }
      }
      await sql`INSERT INTO entity_price (entity_id, source_type, type, price) VALUES (${visible[0]}, 'cardmarket', 'deck', 12.34)`;
      const page1 = await service.decks(id, { page: 1, limit: 12 });
      const page2 = await service.decks(id, { page: 2, limit: 12 });
      expect(page1.items.map(row => row.deck.id)).toEqual(visible.slice(0, 12));
      expect(page1.hasMore).toBe(true);
      expect(page2.items.map(row => row.deck.id)).toEqual(visible.slice(12));
      expect(page2.hasMore).toBe(false);
      expect(page1.items[0].entityPrices[0].price).toBe('12.34');
      expect(Object.keys(page1.items[0].user).sort()).toEqual(['displayName', 'id', 'image']);
      expect(await service.sectionCounts(id)).toEqual({
        videos: 3,
        articles: 1,
        podcasts: 1,
        decks: 15,
        series: 2,
      });
      await sql`UPDATE deck SET public = 0 WHERE id = ${visible[0]}`;
      expect((await service.decks(id, { page: 1, limit: 24 })).items).toHaveLength(14);
      expect((await service.sectionCounts(id)).decks).toBe(14);
      await sql`UPDATE creation SET published = NULL WHERE id IN (${first}, ${second})`;
      expect((await service.decks(id, { page: 1, limit: 12 })).items).toEqual([]);

      expect((await route.request(`/creators/${id}/decks?page=0`)).status).toBe(400);
      expect((await route.request(`/creators/${id}/decks?limit=25`)).status).toBe(400);
      expect((await route.request('/creators/not-an-id/decks')).status).toBe(400);
      const response = await route.request(`/creators/${id}/decks`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: { items: [], hasMore: false } });
      expect((await route.request('/creators/not-an-id/counts')).status).toBe(400);
      const counts = await route.request(`/creators/${id}/counts`);
      expect(counts.status).toBe(200);
      expect(await counts.json()).toEqual({
        data: { videos: 1, articles: 1, podcasts: 1, decks: 0, series: 1 },
      });
      expect(await service.sectionCounts(crypto.randomUUID())).toEqual({
        videos: 0,
        articles: 0,
        podcasts: 0,
        decks: 0,
        series: 0,
      });
    } finally {
      await sql.unsafe('ROLLBACK');
      await sql.end();
    }
  },
  30_000,
);
