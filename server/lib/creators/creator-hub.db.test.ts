// CREATOR_HUB_DB_TEST=1 bun --env-file=.env.worktree test server/lib/creators
import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { user } from '../../db/schema/auth-schema.ts';
import { deck } from '../../db/schema/deck.ts';
import {
  creation,
  creatorOauthState,
  creatorProfile,
  creatorTag,
  creatorYoutube,
  creatorYoutubeChannel,
  creatorChannel,
} from '../../db/schema/creator_hub.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import { createCreatorHubRoute } from '../../routes/creator-hub.ts';
import { creatorService } from './service.ts';
import { youtubeService, stateHash } from './youtube.ts';
import { eligibleChannels } from './channels.ts';
import {
  creationDocumentSchema,
  creatorProfileSchema,
} from '../../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';

test.skipIf(process.env.CREATOR_HUB_DB_TEST !== '1')(
  'creator ownership, draft isolation, publication, discovery, OAuth and sanitization',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const owner = `creator-owner-${crypto.randomUUID()}`,
      editor = `creator-editor-${crypto.randomUUID()}`,
      stranger = `creator-stranger-${crypto.randomUUID()}`;
    const users = [owner, editor, stranger],
      deckId = crypto.randomUUID(),
      directoryId = crypto.randomUUID();
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const id = c.req.header('x-fixture-user');
        c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
        c.set(
          'session',
          id
            ? ({ id: 'fixture-session' } as NonNullable<AuthExtension['Variables']['session']>)
            : null,
        );
        await next();
      })
      .route('/', createCreatorHubRoute());
    const request = (
      id: string | null,
      method: string,
      path: string,
      body?: unknown,
      csrf = true,
    ) =>
      app.request(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(id ? { 'x-fixture-user': id } : {}),
          ...(csrf ? { 'X-Requested-With': 'swubase' } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    const channelId = 'UCabcdefghijklmnopqrstuv';
    const originalFetch = globalThis.fetch;
    const envKeys = [
      'YOUTUBE_CLIENT_ID',
      'YOUTUBE_CLIENT_SECRET',
      'YOUTUBE_TOKEN_ENCRYPTION_KEY',
      'YOUTUBE_API_KEY',
      'BETTER_AUTH_URL',
    ] as const;
    const originalEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
    try {
      await db.insert(user).values(
        users.map(id => ({
          id,
          name: 'Creator test',
          displayName: id,
          email: `${id}@invalid.local`,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      await db
        .insert(deck)
        .values({ id: deckId, userId: owner, name: 'Private testing deck', format: 1, public: 0 });
      const input = creatorProfileSchema.parse({
        slug: `fixture-${crypto.randomUUID()}`,
        name: 'Fixture creator',
        bio: emptyPostDocument(),
        languages: ['pt-BR'],
        specialties: ['format:draft'],
        links: [],
      });
      const directoryInput = creatorProfileSchema.parse({
        ...input,
        slug: `directory-${directoryId}`,
        name: `Directory ${directoryId}`,
        links: [
          { label: 'YouTube', url: 'https://www.youtube.com/channel/UCzzzzzzzzzzzzzzzzzzzzzz' },
        ],
      });
      await db.insert(creatorProfile).values({
        id: directoryId,
        ownerId: null,
        slug: directoryInput.slug,
        profile: directoryInput,
      });
      const publicDirectory = await request(null, 'GET', `/creators/${directoryInput.slug}`);
      expect(publicDirectory.status).toBe(200);
      expect((await publicDirectory.json()).data).toMatchObject({
        ownerId: null,
        youtube: [],
        links: directoryInput.links,
      });
      expect((await creatorService.profiles(directoryInput.name)).items.map(p => p.id)).toEqual([
        directoryId,
      ]);
      expect((await creatorService.mine(owner)).some(p => p.id === directoryId)).toBe(false);
      const duplicateDirectory = await request(owner, 'POST', '/creators', directoryInput);
      expect(duplicateDirectory.status).toBe(409);
      expect((await duplicateDirectory.json()).message).toContain('Connect YouTube');
      expect((await creatorService.profile(directoryInput.slug)).ownerId).toBeNull();
      for (const viewer of [null, owner, stranger]) {
        const status = viewer ? 403 : 401;
        expect(
          (
            await request(viewer, 'PUT', `/creators/${directoryId}`, {
              profile: directoryInput,
              revision: 1,
            })
          ).status,
        ).toBe(status);
        expect((await request(viewer, 'GET', `/creators/${directoryId}/studio`)).status).toBe(
          status,
        );
      }
      expect(
        (
          await request(owner, 'PUT', `/creators/${directoryId}/members`, {
            userId: owner,
            remove: false,
          })
        ).status,
      ).toBe(403);
      expect((await request(null, 'POST', '/creators', input)).status).toBe(401);
      expect((await request(owner, 'POST', '/creators', input, false)).status).toBe(403);
      const rejectedProfile = await request(owner, 'POST', '/creators', {
        ...input,
        name: 'fuck',
      });
      expect(rejectedProfile.status).toBe(400);
      expect(await rejectedProfile.json()).toMatchObject({
        code: 'PROFANITY_NOT_ALLOWED',
        field: 'name',
      });
      const response = await request(owner, 'POST', '/creators', input);
      expect(response.status).toBe(201);
      const profile = (await response.json()).data;
      const duplicateOwned = await request(stranger, 'POST', '/creators', input);
      expect(duplicateOwned.status).toBe(409);
      expect((await duplicateOwned.json()).message).toBe('That creator address is already in use.');
      expect((await creatorService.profiles(input.slug, 1)).items).toHaveLength(0); // Name search is deliberate.
      expect(
        (await creatorService.profiles('Fixture creator', 1, 'PT', 'format:limited')).items.some(
          p => p.id === profile.id,
        ),
      ).toBe(true);
      expect(
        (await creatorService.profiles('Fixture creator', 1, 'en', 'format:limited')).items.some(
          p => p.id === profile.id,
        ),
      ).toBe(false);
      expect(
        (
          await request(null, 'GET', '/youtube/callback?code=ignored&state=' + 'x'.repeat(40))
        ).headers.get('location'),
      ).toBe('/creator-studio?youtube=failed');
      expect(
        (await request(owner, 'GET', '/youtube/callback?state=bad')).headers.get('location'),
      ).toBe('/creator-studio?youtube=failed');
      expect(
        (await request(stranger, 'PUT', `/creators/${profile.id}`, { profile: input, revision: 1 }))
          .status,
      ).toBe(403);
      expect(
        (await request(owner, 'PUT', `/creators/${profile.id}`, { profile: input, revision: 99 }))
          .status,
      ).toBe(409);
      await creatorService.setMember(profile.id, owner, editor, false);
      const body = emptyPostDocument();
      body.blocks[0] = {
        ...body.blocks[0],
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: 'An actual draft guide.', styles: {} }],
      };
      const doc = creationDocumentSchema.parse({
        title: 'Draft guide',
        medium: 'article',
        body,
        language: 'en',
        tags: ['purpose:deck-guide', 'format:draft'],
        references: [],
        chapters: [],
      });
      // Imported/review drafts remain editable, but cannot bypass moderation when published.
      const rejectedDraft = await creatorService.save(profile.id, owner, {
        ...doc,
        body: {
          ...doc.body,
          blocks: [
            {
              id: 'moderation-fixture',
              type: 'paragraph',
              props: {},
              content: [
                { type: 'text', text: 'fu', styles: {} },
                { type: 'text', text: 'ck', styles: { bold: true } },
              ],
              children: [],
            },
          ],
        },
      });
      const rejectedPublication = await request(
        owner,
        'POST',
        `/creations/${rejectedDraft.id}/publish`,
        {
          revision: rejectedDraft.revision,
        },
      );
      expect(rejectedPublication.status).toBe(400);
      expect(await rejectedPublication.json()).toMatchObject({ code: 'PROFANITY_NOT_ALLOWED' });
      expect((await request(null, 'GET', `/creations/${rejectedDraft.id}`)).status).toBe(404);
      expect(
        (await creatorService.get(rejectedDraft.id, owner, true)).document.body.blocks[0],
      ).toMatchObject({
        content: [{ text: 'fu' }, { text: 'ck' }],
      });
      expect(
        (await request(owner, 'POST', '/creations', { creatorId: directoryId, document: doc }))
          .status,
      ).toBe(403);
      const item = await creatorService.save(profile.id, editor, { ...doc, durationSeconds: 999 });
      expect(
        (await creatorService.get(item.id, editor, true)).document.durationSeconds,
      ).toBeUndefined();
      expect((await request(null, 'GET', `/creations/${item.id}`)).status).toBe(404);
      expect((await request(null, 'GET', `/creations/${item.id}/draft`)).status).toBe(401);
      expect((await request(stranger, 'GET', `/creations/${item.id}/draft`)).status).toBe(403);
      expect(
        (await creatorService.discover({ creatorId: profile.id, page: 1 })).items,
      ).toHaveLength(0);
      expect(
        (
          await request(stranger, 'POST', `/creations/${item.id}/publish`, {
            revision: item.revision,
          })
        ).status,
      ).toBe(403);
      expect(
        (await request(editor, 'POST', `/creations/${item.id}/publish`, { revision: 99 })).status,
      ).toBe(409);
      await creatorService.publish(item.id, editor, item.revision);
      const firstPublication = await creatorService.get(item.id);
      const listing = (
        await (await request(null, 'GET', `/creations?creatorId=${profile.id}&limit=1`)).json()
      ).data;
      expect(listing.items).toHaveLength(1);
      expect(listing.items[0].document).not.toHaveProperty('body');
      expect(listing.items[0].document).not.toHaveProperty('videoDescription');
      expect(listing.items[0]).not.toHaveProperty('references');
      expect(firstPublication.document.body).toEqual(doc.body);
      expect((await creatorService.studio(profile.id, owner)).items[0].document).not.toHaveProperty(
        'body',
      );
      for (const limit of ['0', '25', 'bad', '-1', '1.5'])
        expect((await request(null, 'GET', `/creations?limit=${limit}`)).status).toBe(400);

      expect(
        (
          await creatorService.discover({
            creatorId: profile.id,
            tags: 'purpose:gameplay,purpose:deck-guide,format:limited',
            page: 1,
          })
        ).items,
      ).toHaveLength(1);
      expect(
        (
          await creatorService.discover({
            creatorId: profile.id,
            tags: 'purpose:gameplay,format:limited',
            page: 1,
          })
        ).items,
      ).toHaveLength(0);
      const changed = await creatorService.save(
        profile.id,
        editor,
        { ...doc, title: 'PRIVATE unfinished changes' },
        item.id,
        item.revision,
      );
      expect((await creatorService.get(item.id)).document.title).toBe('Draft guide');
      expect(
        JSON.stringify(await creatorService.discover({ creatorId: profile.id, page: 1 })),
      ).not.toContain('PRIVATE');
      expect(
        (
          await request(editor, 'PUT', `/creations/${item.id}`, {
            creatorId: profile.id,
            document: doc,
            revision: item.revision,
          })
        ).status,
      ).toBe(409);
      const privateRef = await creatorService.save(
        profile.id,
        owner,
        { ...doc, references: [{ type: 'deck', id: deckId, startSeconds: null }] },
        item.id,
        changed.revision,
      );
      expect(
        (
          await request(owner, 'POST', `/creations/${item.id}/publish`, {
            revision: privateRef.revision,
          })
        ).status,
      ).toBe(400);
      await db.update(deck).set({ public: 1 }).where(eq(deck.id, deckId));
      await creatorService.publish(item.id, owner, privateRef.revision);
      const updatedPublication = await creatorService.get(item.id);
      expect(updatedPublication.publishedAt).toBe(firstPublication.publishedAt);
      expect(Date.parse(updatedPublication.updatedAt)).toBeGreaterThanOrEqual(
        Date.parse(firstPublication.updatedAt),
      );
      expect(
        (
          await creatorService.discover({
            creatorId: profile.id,
            entityType: 'deck',
            entityId: deckId,
            page: 1,
          })
        ).items,
      ).toHaveLength(1);
      await db.update(deck).set({ public: 0 }).where(eq(deck.id, deckId));
      expect((await creatorService.get(item.id)).references).toHaveLength(0);
      expect((await creatorService.get(item.id)).document.references).toHaveLength(0);
      expect(
        (await creatorService.discover({ entityType: 'deck', entityId: deckId, page: 1 })).items,
      ).toHaveLength(0);
      await creatorService.setMember(profile.id, owner, editor, true);
      expect((await request(editor, 'GET', `/creations/${item.id}/draft`)).status).toBe(403);
      await creatorService.publish(item.id, owner, privateRef.revision, true);
      expect((await request(null, 'GET', `/creations/${item.id}`)).status).toBe(404);
      expect((await creatorService.revisions(item.id, owner)).length).toBeGreaterThan(1);
      const linked = await creatorService.save(profile.id, owner, {
        ...doc,
        language: 'pt-BR',
        series: 'Limited course',
        pinned: true,
        references: [
          { type: 'card', id: 'sabine-wren--galvanized-revolutionary', startSeconds: 42 },
        ],
      });
      await creatorService.publish(linked.id, owner, linked.revision);
      for (const type of ['card', 'leader'] as const)
        expect(
          (
            await creatorService.discover({
              creatorId: profile.id,
              entityType: type,
              entityId: 'sabine-wren--galvanized-revolutionary',
              language: 'pt',
              page: 1,
            })
          ).items.map(item => item.id),
        ).toContain(linked.id);
      expect((await creatorService.collections(profile.id)).series).toEqual(['Limited course']);
      expect(
        (
          await creatorService.discover({
            creatorId: profile.id,
            series: 'Limited course',
            page: 1,
          })
        ).items.map(item => item.id),
      ).toEqual([linked.id]);
      let lastRevision = linked.revision;
      for (let n = 0; n < 33; n++)
        lastRevision = (
          await creatorService.save(
            profile.id,
            owner,
            { ...doc, title: `Draft revision ${n}` },
            linked.id,
            lastRevision,
          )
        ).revision;
      const history = await creatorService.revisions(linked.id, owner);
      expect(history.length).toBeLessThanOrEqual(32);
      expect(history.some(row => row.revision === linked.revision)).toBe(true);
      expect(history.some(row => row.revision === 2)).toBe(false);

      Object.assign(process.env, {
        YOUTUBE_API_KEY: 'fixture-key',
        YOUTUBE_CLIENT_ID: 'fixture-client',
        YOUTUBE_CLIENT_SECRET: 'fixture-secret',
        YOUTUBE_TOKEN_ENCRYPTION_KEY: '7f'.repeat(32),
        BETTER_AUTH_URL: 'http://localhost:5180',
      });
      expect((await request(owner, 'POST', `/creators/${directoryId}/youtube`)).status).toBe(403);
      const connect = await youtubeService.connect(profile.id, owner, 'fixture-session');
      const authorization = new URL(connect.url),
        state = authorization.searchParams.get('state')!;
      expect(authorization.searchParams.get('scope')).toBe(
        'https://www.googleapis.com/auth/youtube.readonly',
      );
      expect(authorization.searchParams.get('redirect_uri')).toBe(
        'http://localhost:5180/api/creator-hub/youtube/callback',
      );
      expect(authorization.searchParams.get('code_challenge_method')).toBe('S256');
      expect(authorization.searchParams.get('access_type')).toBe('offline');
      const [pending] = await db
        .select()
        .from(creatorOauthState)
        .where(eq(creatorOauthState.hash, stateHash(state)));
      expect(pending.verifier).not.toBe(authorization.searchParams.get('code_challenge'));
      await expect(youtubeService.callback(owner, 'other-session', state, 'code')).rejects.toThrow(
        'expired',
      );
      let calls = 0;
      globalThis.fetch = (async (url: string | URL | Request) => {
        calls++;
        if (String(url).includes('oauth2.googleapis.com'))
          return Response.json({
            access_token: 'fixture-access',
            refresh_token: 'fixture-refresh',
            expires_in: 3600,
          });
        if (String(url).includes('/channels'))
          return Response.json({
            items: [
              {
                id: channelId,
                snippet: {
                  title: 'Verified test channel',
                  thumbnails: { high: { url: 'https://example.com/channel-avatar.png' } },
                },
              },
            ],
          });
        return Response.json({
          items: [
            {
              id: 'abcdefghijk',
              snippet: {
                channelId,
                title: 'Imported video',
                description: 'A public video.',
                publishedAt: new Date().toISOString(),
              },
              contentDetails: { duration: 'PT5M' },
              status: { privacyStatus: 'public' },
            },
          ],
        });
      }) as typeof fetch;
      const callback = await request(owner, 'GET', `/youtube/callback?state=${state}&code=code`);
      expect(callback.status).toBe(302);
      expect(callback.headers.get('location')).toBe(
        `/creator-studio?creatorId=${profile.id}&youtube=connected&youtubeChannelId=${channelId}&transferredDecks=0`,
      );
      await expect(
        youtubeService.callback(owner, 'fixture-session', state, 'code'),
      ).rejects.toThrow('expired');
      expect(calls).toBe(2);
      const [connection] = await db
        .select()
        .from(creatorYoutube)
        .where(eq(creatorYoutube.creatorId, profile.id));
      expect(connection.accessToken).not.toContain('fixture-access');
      expect(connection).not.toHaveProperty('title');
      expect((await eligibleChannels()).channels.get(channelId)).toBe(profile.id);
      expect((await youtubeService.status(profile.id, owner)).channels[0].title).toBe(
        'Verified test channel',
      );
      const channelStatus = await request(owner, 'GET', `/creators/${profile.id}/youtube`);
      expect(channelStatus.status).toBe(200);
      const statusBody = await channelStatus.json();
      expect(statusBody.data.channels[0].avatarUrl).toBe('https://example.com/channel-avatar.png');
      expect(Object.keys(statusBody.data.channels[0]).sort()).toEqual([
        'autoImportEnabled',
        'avatarUrl',
        'channelId',
        'connected',
        'connectedAt',
        'disconnectReason',
        'disconnectedAt',
        'lastManualFetchAt',
        'title',
      ]);
      expect((await request(null, 'GET', `/creators/${profile.id}/youtube`)).status).toBe(401);
      expect((await request(editor, 'GET', `/creators/${profile.id}/youtube`)).status).toBe(403);
      expect((await request(stranger, 'GET', `/creators/${profile.id}/youtube`)).status).toBe(403);

      expect(JSON.stringify(await creatorService.profile(input.slug))).not.toContain('accessToken');
      delete process.env.YOUTUBE_API_KEY;
      await expect(
        youtubeService.importVideo(profile.id, owner, channelId, 'zyxwvutsrqp'),
      ).rejects.toMatchObject({ status: 503 });
      process.env.YOUTUBE_API_KEY = 'fixture-key';
      const imported = await youtubeService.importVideo(
        profile.id,
        owner,
        channelId,
        'https://youtu.be/abcdefghijk',
      );
      expect((await request(null, 'GET', `/creations/${imported.id}`)).status).toBe(404);
      const importedDraft = await creatorService.get(imported.id, owner, true);
      expect(importedDraft.sourceVerified).toBe(true);
      expect(importedDraft.document.language).toBe('pt-BR');
      expect(importedDraft.document.durationSeconds).toBe(300);
      const durationEdit = await request(owner, 'PUT', `/creations/${imported.id}`, {
        creatorId: profile.id,
        document: { ...importedDraft.document, durationSeconds: 999 },
        revision: importedDraft.revision,
        ownershipRevision: importedDraft.ownershipRevision,
      });
      expect(durationEdit.status).toBe(200);
      expect((await creatorService.get(imported.id, owner, true)).document.durationSeconds).toBe(
        300,
      );
      const [durationRow] = await db.select().from(creation).where(eq(creation.id, imported.id));
      expect(durationRow.manuallyEditedFields).not.toContain('durationSeconds');
      await expect(
        creatorService.save(
          profile.id,
          owner,
          { ...importedDraft.document, sourceUrl: 'https://youtu.be/zyxwvutsrqp' },
          imported.id,
          importedDraft.revision,
        ),
      ).rejects.toThrow('original YouTube source');
      await expect(
        creatorService.save(
          profile.id,
          owner,
          { ...importedDraft.document, medium: 'article' },
          imported.id,
          importedDraft.revision,
        ),
      ).rejects.toThrow('original YouTube source');
      await creatorService.setMember(profile.id, owner, editor, false);
      await expect(youtubeService.connect(profile.id, editor, 'fixture-session')).rejects.toThrow(
        'cannot manage',
      );
      await expect(
        youtubeService.importVideo(profile.id, editor, channelId, 'abcdefghijk'),
      ).rejects.toThrow('cannot manage');
      await expect(youtubeService.disconnect(profile.id, editor, channelId)).rejects.toThrow(
        'cannot manage',
      );
      expect(
        (await youtubeService.importVideo(profile.id, owner, channelId, 'abcdefghijk')).id,
      ).toBe(imported.id);
      await expect(
        youtubeService.importVideo(profile.id, stranger, channelId, 'abcdefghijk'),
      ).rejects.toThrow('cannot manage');
      await expect(
        youtubeService.importVideo(profile.id, owner, 'UCdifferentchannel000000', 'zyxwvutsrqp'),
      ).rejects.toThrow('Connect');
      const paginationProfile = await creatorService.saveProfile(owner, {
        ...input,
        slug: `pages-${crypto.randomUUID()}`,
      });
      const pageIds: string[] = [];
      for (let index = 0; index < 4; index++) {
        const saved = await creatorService.save(paginationProfile.id, owner, {
          ...doc,
          title: `Page fixture ${index}`,
        });
        await creatorService.publish(saved.id, owner, saved.revision);
        pageIds.push(saved.id);
      }
      const firstPage = await creatorService.discover({
        creatorId: paginationProfile.id,
        page: 1,
        limit: 3,
      });
      const nextPage = await creatorService.discover({
        creatorId: paginationProfile.id,
        page: 2,
        limit: 3,
      });
      expect(firstPage.items).toHaveLength(3);
      expect(firstPage.hasMore).toBe(true);
      expect(nextPage.items).toHaveLength(1);
      expect(nextPage.hasMore).toBe(false);
      expect([...firstPage.items, ...nextPage.items].map(item => item.id).sort()).toEqual(
        pageIds.sort(),
      );
      const beforeTags = (await db.select().from(creatorTag)).length;
      const sanitize = await Bun.file(
        new URL('../../../scripts/remote-dev/sql/001-core-data.sql', import.meta.url),
      ).text();
      const block = sanitize.match(/DO \$creator_hub\$[\s\S]*?\$creator_hub\$;/)![0];
      const rollback = new Error('rollback fixture');
      await expect(
        db.transaction(async tx => {
          await tx.execute(sql.raw(block));
          expect(
            await tx
              .select()
              .from(creatorProfile)
              .where(sql`${creatorProfile.ownerId} IS NOT NULL`),
          ).toHaveLength(0);
          expect(await tx.select().from(creatorYoutube)).toHaveLength(0);
          expect(await tx.select().from(creatorYoutubeChannel)).toHaveLength(0);
          expect(await tx.select().from(creatorChannel)).toHaveLength(0);
          expect(await tx.select().from(creatorTag)).toHaveLength(beforeTags);
          throw rollback;
        }),
      ).rejects.toThrow('rollback fixture');
      await youtubeService.disconnect(profile.id, owner, channelId);
      expect((await eligibleChannels()).channels.has(channelId)).toBe(true);
      expect(
        await db.select().from(creatorChannel).where(eq(creatorChannel.channelId, channelId)),
      ).toHaveLength(1);
      expect(
        await db
          .select()
          .from(creatorYoutubeChannel)
          .where(eq(creatorYoutubeChannel.channelId, channelId)),
      ).toHaveLength(1);
      expect((await creatorService.get(imported.id, owner, true)).id).toBe(imported.id);
      await db.delete(creatorYoutubeChannel).where(eq(creatorYoutubeChannel.channelId, channelId));
      expect(
        await db
          .select()
          .from(creatorYoutube)
          .where(
            and(eq(creatorYoutube.creatorId, profile.id), eq(creatorYoutube.channelId, channelId)),
          ),
      ).toHaveLength(0);
    } finally {
      globalThis.fetch = originalFetch;
      for (const key of envKeys)
        if (originalEnv[key] === undefined) delete process.env[key];
        else process.env[key] = originalEnv[key];
      await db.delete(deck).where(eq(deck.id, deckId));
      await db.delete(creatorProfile).where(eq(creatorProfile.id, directoryId));
      await db.delete(user).where(inArray(user.id, users));
      await db.delete(creatorYoutubeChannel).where(eq(creatorYoutubeChannel.channelId, channelId));
    }
  },
  30_000,
);
