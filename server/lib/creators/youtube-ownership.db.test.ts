// CREATOR_HUB_DB_TEST=1 bun --env-file=.env.worktree test server/lib/creators/youtube-ownership.db.test.ts
import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { user } from '../../db/schema/auth-schema.ts';
import {
  creation,
  creatorChannel,
  creatorOauthState,
  creatorProfile,
  creatorMember,
  creatorYoutube,
  creationReference,
  creatorYoutubeChannel,
} from '../../db/schema/creator_hub.ts';
import {
  creatorImportedDeck,
  creatorClaimedDeck,
  creatorVideoJob,
  creatorChannelResolution,
} from '../../db/schema/creator_video_job.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import { deckFolder, deckFolderDeck } from '../../db/schema/deck_folder.ts';
import type { AuthExtension } from '../../auth/auth.ts';
import { createCreatorHubRoute } from '../../routes/creator-hub.ts';
import {
  creationDocumentSchema,
  creatorProfileSchema,
} from '../../../shared/creators/contracts.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';
import { createYoutubeOwnershipService, stateHash } from './youtube-ownership.ts';
import { eligibleChannels } from './channels.ts';
import { createWorkerStore } from './worker/store.ts';
import { createDiscoveryService } from './discovery.ts';
import { resolveReferences } from './references.ts';

test.skipIf(process.env.CREATOR_HUB_DB_TEST !== '1')(
  'YouTube claims verify ownership, serialize transfers and require new-profile confirmation',
  async () => {
    const target = new URL(process.env.DATABASE_URL!);
    if (target.hostname !== '127.0.0.1' || !target.pathname.startsWith('/swubase_'))
      throw new Error('Use an isolated worktree database.');
    const random = () => crypto.randomUUID().replaceAll('-', '');
    const users = Array.from({ length: 5 }, () => `claim-test-${random()}`);
    const [owner, other, newcomer, racer, handleOwner] = users;
    const channelIds = Array.from({ length: 7 }, () => `UC${random().slice(0, 22)}`);
    const handle = `Claim${random().slice(0, 12)}`,
      handleUrl = `https://www.youtube.com/@${handle}`;
    const profileIds: string[] = [],
      deckIds: string[] = [];
    const systemFolderId = crypto.randomUUID();
    const service = createYoutubeOwnershipService();
    const originalFetch = globalThis.fetch;
    const keys = [
      'YOUTUBE_CLIENT_ID',
      'YOUTUBE_CLIENT_SECRET',
      'YOUTUBE_TOKEN_ENCRYPTION_KEY',
      'BETTER_AUTH_URL',
    ] as const;
    const originalEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    let providerCalls = 0;
    const app = new Hono<AuthExtension>()
      .use('*', async (c, next) => {
        const id = c.req.header('x-fixture-user');
        c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
        c.set(
          'session',
          id ? ({ id: 'session' } as NonNullable<AuthExtension['Variables']['session']>) : null,
        );
        await next();
      })
      .route('/', createCreatorHubRoute());
    const request = (
      id: string | null,
      method: string,
      path: string,
      json?: unknown,
      csrf = true,
    ) =>
      app.request(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(id ? { 'x-fixture-user': id } : {}),
          ...(csrf ? { 'X-Requested-With': 'swubase' } : {}),
        },
        body: json === undefined ? undefined : JSON.stringify(json),
      });
    const addProfile = async (
      channelId: string,
      ownerId: string | null = null,
      handle?: string,
    ) => {
      const id = crypto.randomUUID();
      profileIds.push(id);
      const profile = creatorProfileSchema.parse({
        slug: `claim-${id}`,
        name: 'Claim fixture',
        languages: ['en'],
        specialties: [],
        bio: emptyPostDocument(),
        links: [
          {
            label: 'YouTube',
            url: handle
              ? `https://www.youtube.com/@${handle}`
              : `https://www.youtube.com/channel/${channelId}`,
          },
        ],
      });
      await db.insert(creatorProfile).values({ id, ownerId, slug: profile.slug, profile });
      return id;
    };
    const start = async (userId: string, creatorId?: string, session = 'session') =>
      new URL((await service.claim(userId, session, creatorId)).url).searchParams.get('state')!;
    const callback = async (userId: string, channelId: string, creatorId?: string) =>
      service.callback(userId, 'session', await start(userId, creatorId), channelId);
    const getDeck = async (id: string) => (await db.select().from(deck).where(eq(deck.id, id)))[0];
    try {
      Object.assign(process.env, {
        YOUTUBE_CLIENT_ID: 'fixture-client',
        YOUTUBE_CLIENT_SECRET: 'fixture-secret',
        YOUTUBE_TOKEN_ENCRYPTION_KEY: '4e'.repeat(32),
        BETTER_AUTH_URL: 'http://localhost:5177',
      });
      globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
        providerCalls++;
        if (String(input) === 'https://oauth2.googleapis.com/token') {
          const code = new URLSearchParams(String(init?.body)).get('code');
          return Response.json({
            access_token: code,
            refresh_token: 'fixture-refresh',
            expires_in: 3600,
          });
        }
        if (String(input).startsWith('https://www.googleapis.com/youtube/v3/channels?')) {
          const id = new Headers(init?.headers).get('Authorization')!.replace('Bearer ', '');
          return Response.json({
            items: [
              {
                id,
                snippet: {
                  title: 'Verified fixture channel',
                  customUrl: id === channelIds[5] ? `@${handle}` : '@DifferentHandle',
                  thumbnails: { high: { url: 'https://example.com/avatar.png' } },
                },
              },
            ],
          });
        }
        throw new Error('Unexpected network request in claim test');
      }) as typeof fetch;
      await db.insert(user).values(
        users.map(id => ({
          id,
          name: 'Claim fixture',
          email: `${id}@invalid.local`,
          displayName: id,
          emailVerified: false,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
      const profileId = await addProfile(channelIds[0]);
      await db
        .insert(creatorYoutubeChannel)
        .values(channelIds.slice(0, 2).map(channelId => ({ channelId })));
      await db
        .insert(creatorChannel)
        .values(
          channelIds
            .slice(0, 2)
            .map(channelId => ({ creatorId: profileId, channelId, origin: 'curated' as const })),
        );
      for (const [userId, visibility] of [
        ['swubase', 1],
        ['swubase', 2],
        [other, 1],
        ['swubase', 1],
        ['swubase', 0],
      ] as const) {
        const id = crypto.randomUUID();
        deckIds.push(id);
        await db
          .insert(deck)
          .values({ id, userId, public: visibility, format: 1, name: 'Claim fixture deck' });
      }
      await db.insert(deckCard).values(
        [1, 2, 3].map(board => ({
          deckId: deckIds[0],
          cardId: 'fixture-card',
          quantity: board,
          board,
        })),
      );
      await db.insert(creatorImportedDeck).values(
        deckIds.slice(0, 2).map((deckId, index) => ({
          deckId,
          userId: 'swubase',
          source: 'swudb',
          sourceDeckId: `claim-${deckId}`,
          pendingPublication: index === 1,
        })),
      );
      // Preserve original-deck provenance even when the claimant has a tombstone.
      await db.insert(creatorImportedDeck).values({
        userId: owner,
        source: 'swudb',
        sourceDeckId: `claim-${deckIds[0]}`,
        deckId: null,
      });
      const stagedId = crypto.randomUUID(),
        stagedSource = `stage-${random()}`;
      deckIds.push(stagedId);
      await db.insert(deck).values({
        id: stagedId,
        userId: 'swubase',
        public: 2,
        format: 1,
        name: 'Staged claim deck',
      });
      await db.insert(creatorImportedDeck).values({
        userId: 'swubase',
        source: 'swudb',
        sourceDeckId: stagedSource,
        deckId: stagedId,
        pendingPublication: true,
      });
      await db
        .insert(deckFolder)
        .values({ id: systemFolderId, userId: 'swubase', name: 'Claim test source folder' });
      await db.insert(deckFolderDeck).values({ deckId: deckIds[0], folderId: systemFolderId });
      const doc = creationDocumentSchema.parse({
        title: 'SWU deck guide',
        tags: [],
        chapters: [],
        medium: 'video',
        sourceUrl: `https://youtu.be/${random().slice(0, 11)}`,
        body: emptyPostDocument(),
        references: [deckIds[0], deckIds[2], deckIds[4]].map(id => ({ type: 'deck', id })),
      });
      const videoId = random().slice(0, 11);
      const runningVideo = random().slice(0, 11);
      const store = createWorkerStore();
      await store.enqueue([
        { videoId: runningVideo, creatorId: profileId, channelId: channelIds[0] },
      ]);
      const runningJob = (await store.claim(runningVideo))!;
      await store.checkpoint(runningJob, {
        metadata: {
          id: runningVideo,
          channelId: channelIds[0],
          title: 'Unfinished SWU video',
          description: `https://swudb.com/deck/${stagedSource}`,
          durationSeconds: 600,
          publishedAt: new Date().toISOString(),
          thumbnail: '',
        },
      });
      await db.insert(creation).values({
        creatorId: profileId,
        sourceVideoId: videoId,
        draft: { ...doc, references: [...doc.references, { type: 'deck', id: deckIds[1] }] },
        published: doc,
        publishedAt: new Date().toISOString(),
      });
      // An existing shared link keeps the very same original, as requested.
      const sharedProfile = await addProfile(channelIds[2]);
      await db.insert(creatorYoutubeChannel).values({ channelId: channelIds[2] });
      await db
        .insert(creatorChannel)
        .values({ creatorId: sharedProfile, channelId: channelIds[2], origin: 'curated' });
      const sharedRunningVideo = random().slice(0, 11);
      await store.enqueue([
        { videoId: sharedRunningVideo, creatorId: sharedProfile, channelId: channelIds[2] },
      ]);
      const sharedJob = (await store.claim(sharedRunningVideo))!;
      await store.checkpoint(sharedJob, {
        metadata: {
          id: sharedRunningVideo,
          channelId: channelIds[2],
          title: 'Shared staged SWU deck',
          description: `https://swudb.com/deck/${stagedSource}`,
          durationSeconds: 600,
          publishedAt: new Date().toISOString(),
          thumbnail: '',
        },
      });
      const sharedExistingVideo = random().slice(0, 11);
      await db.insert(creation).values({
        creatorId: sharedProfile,
        sourceVideoId: sharedExistingVideo,
        draft: doc,
        published: doc,
      });
      const indexed = await db
        .select()
        .from(creation)
        .where(inArray(creation.creatorId, [profileId, sharedProfile]));
      await db.insert(creationReference).values(
        indexed.flatMap(row =>
          row.published!.references.map(ref => ({
            creationId: row.id,
            entityType: ref.type,
            entityId: ref.id,
          })),
        ),
      );
      expect((await request(null, 'POST', '/youtube/claim', {})).status).toBe(401);
      expect((await request(owner, 'POST', '/youtube/claim', {}, false)).status).toBe(403);
      expect((await request(owner, 'POST', '/youtube/claim', { creatorId: 'bad' })).status).toBe(
        400,
      );
      const wrong = await start(other, profileId);
      const mismatch = await request(
        other,
        'GET',
        `/youtube/callback?state=${wrong}&code=${channelIds[6]}`,
      );
      expect(mismatch.headers.get('location')).toContain('youtubeError=channel_mismatch');
      expect((await getDeck(deckIds[0])).userId).toBe('swubase');
      const state = await start(owner, profileId);
      const before = providerCalls;
      await expect(service.callback(owner, 'wrong-session', state, channelIds[0])).rejects.toThrow(
        'expired',
      );
      expect(providerCalls).toBe(before);
      const claimed = await service.callback(owner, 'session', state, channelIds[0]);
      await expect(store.checkpoint(runningJob, {})).rejects.toThrow('job_claim_lost');
      expect(
        (
          await db.select().from(creatorVideoJob).where(eq(creatorVideoJob.videoId, runningVideo))
        )[0],
      ).toMatchObject({ status: 'pending', attempts: 0, claimId: null });
      expect(claimed).toMatchObject({ claimed: true, creatorId: profileId, transferredDecks: 3 });
      // This other creator already imported the same staged original before it
      // moved. Publishing must keep that original, without another import/copy.
      expect(
        await store.publish(
          sharedJob,
          {
            ...doc,
            sourceUrl: `https://youtu.be/${sharedRunningVideo}`,
            references: [{ type: 'deck', id: stagedId, startSeconds: null }],
          },
          true,
          [],
        ),
      ).toBe('published');
      expect(
        (await db.select().from(creation).where(eq(creation.sourceVideoId, sharedRunningVideo)))[0]
          .published!.references,
      ).toContainEqual({ type: 'deck', id: stagedId, startSeconds: null });
      await expect(service.callback(owner, 'session', state, channelIds[0])).rejects.toThrow(
        'expired',
      );
      const [folder] = await db.select().from(deckFolder).where(eq(deckFolder.userId, owner));
      expect(folder.name).toBe('Youtube Connection Decklists');
      for (const id of [...deckIds.slice(0, 2), stagedId]) {
        expect(await getDeck(id)).toMatchObject({ userId: owner, public: 2 });
        expect(
          (await db.select().from(deckFolderDeck).where(eq(deckFolderDeck.deckId, id)))[0].folderId,
        ).toBe(folder.id);
      }
      expect(await getDeck(deckIds[2])).toMatchObject({ userId: other, public: 1 });
      expect(await getDeck(deckIds[3])).toMatchObject({ userId: 'swubase', public: 1 });
      expect(await getDeck(deckIds[4])).toMatchObject({ userId: 'swubase', public: 0 });
      expect(
        (await db.select().from(deckCard).where(eq(deckCard.deckId, deckIds[0])))
          .map(row => row.quantity)
          .sort(),
      ).toEqual([1, 2, 3]);
      const mappings = await db
        .select()
        .from(creatorImportedDeck)
        .where(inArray(creatorImportedDeck.deckId, deckIds));
      expect(mappings).toHaveLength(2);
      expect(
        await db
          .select()
          .from(creatorClaimedDeck)
          .where(inArray(creatorClaimedDeck.deckId, deckIds)),
      ).toHaveLength(3);
      expect(
        (
          await db
            .select()
            .from(creatorImportedDeck)
            .where(
              and(
                eq(creatorImportedDeck.userId, owner),
                eq(creatorImportedDeck.sourceDeckId, `claim-${deckIds[0]}`),
              ),
            )
        )[0].deckId,
      ).toBeNull();
      expect(mappings.every(row => row.userId === owner && !row.pendingPublication)).toBe(true);
      expect(
        (
          await resolveReferences(doc.references, db, undefined, {
            creatorId: profileId,
            ownerId: owner,
          })
        ).map(ref => ref.id),
      ).toEqual([deckIds[0], deckIds[2]]);
      expect((await eligibleChannels()).channels.get(channelIds[1])).toBe(profileId);
      const scopedResolve = await request(owner, 'POST', '/subjects/resolve', {
        references: doc.references,
        creatorId: profileId,
      });
      expect(scopedResolve.status).toBe(200);
      expect((await scopedResolve.json()).data.map((ref: { id: string }) => ref.id)).toContain(
        deckIds[0],
      );
      expect(
        (
          await request(other, 'POST', '/subjects/resolve', {
            references: doc.references,
            creatorId: profileId,
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await request(null, 'POST', '/subjects/resolve', {
            references: doc.references,
            creatorId: profileId,
          })
        ).status,
      ).toBe(401);
      const choices = await request(
        owner,
        'GET',
        `/subjects?type=deck&scope=authoring&creatorId=${profileId}`,
      );
      expect((await choices.json()).data.map((ref: { id: string }) => ref.id)).toContain(
        deckIds[0],
      );
      const personalChoices = await request(owner, 'GET', '/subjects?type=deck&scope=authoring');
      expect(
        (await personalChoices.json()).data.map((ref: { id: string }) => ref.id),
      ).not.toContain(deckIds[0]);
      expect(
        (await request(other, 'GET', `/subjects?type=deck&scope=authoring&creatorId=${profileId}`))
          .status,
      ).toBe(403);
      await db.insert(creatorMember).values({ creatorId: profileId, userId: other });
      const memberResolve = await request(other, 'POST', '/subjects/resolve', {
        references: doc.references,
        creatorId: profileId,
      });
      expect(memberResolve.status).toBe(200);
      expect((await memberResolve.json()).data.map((ref: { id: string }) => ref.id)).toContain(
        deckIds[0],
      );
      const memberChoices = await request(
        other,
        'GET',
        `/subjects?type=deck&scope=authoring&creatorId=${profileId}`,
      );
      expect(memberChoices.status).toBe(200);
      expect((await memberChoices.json()).data.map((ref: { id: string }) => ref.id)).not.toContain(
        deckIds[0],
      );
      await db
        .delete(creatorMember)
        .where(and(eq(creatorMember.creatorId, profileId), eq(creatorMember.userId, other)));
      const publicChoices = await request(
        null,
        'GET',
        `/subjects?type=deck&creatorId=${profileId}`,
      );
      expect((await publicChoices.json()).data.map((ref: { id: string }) => ref.id)).not.toContain(
        deckIds[0],
      );
      const shared = (
        await db.select().from(creation).where(eq(creation.sourceVideoId, sharedExistingVideo))
      )[0];
      expect(shared.published!.references[0].id).toBe(deckIds[0]);
      expect(
        (await resolveReferences(doc.references, db, undefined, { creatorId: sharedProfile })).map(
          ref => ref.id,
        ),
      ).toContain(deckIds[0]);
      expect(
        (await createDiscoveryService().collections(profileId)).decks.map(ref => ref.id),
      ).not.toContain(deckIds[0]);
      expect((await resolveReferences(doc.references)).map(ref => ref.id)).not.toContain(
        deckIds[0],
      );
      await db.update(deck).set({ public: 2 }).where(eq(deck.id, deckIds[2]));
      expect(
        (
          await resolveReferences(doc.references, db, undefined, {
            creatorId: profileId,
            ownerId: owner,
          })
        ).map(ref => ref.id),
      ).toEqual([deckIds[0]]);
      await db.update(deck).set({ public: 1 }).where(eq(deck.id, deckIds[2]));
      // Duplicate directory entries must not block an already verified owner's reconnect.
      const duplicateDirectory = await addProfile(channelIds[0]);
      for (const revoked of [false, true]) {
        if (revoked) {
          await db.delete(creatorYoutube).where(eq(creatorYoutube.channelId, channelIds[0]));
          await db
            .update(creatorChannel)
            .set({
              origin: 'public',
              disconnectedAt: new Date().toISOString(),
              disconnectReason: 'authorization_removed',
            })
            .where(
              and(
                eq(creatorChannel.creatorId, profileId),
                eq(creatorChannel.channelId, channelIds[0]),
              ),
            );
        }
        const reconnect = new URL(
          (await service.connect(profileId, owner, 'session')).url,
        ).searchParams.get('state')!;
        expect(await service.callback(owner, 'session', reconnect, channelIds[0])).toMatchObject({
          creatorId: profileId,
          claimed: false,
        });
      }
      expect(
        (await db.select().from(creatorProfile).where(eq(creatorProfile.id, duplicateDirectory)))[0]
          .ownerId,
      ).toBeNull();
      const explicitConnect = new URL(
        (await service.connect(profileId, owner, 'session')).url,
      ).searchParams.get('state')!;
      await expect(
        service.callback(owner, 'session', explicitConnect, channelIds[2]),
      ).rejects.toThrow('another creator profile');
      expect(
        (await db.select().from(creatorProfile).where(eq(creatorProfile.id, sharedProfile)))[0]
          .ownerId,
      ).toBeNull();
      expect(await callback(owner, channelIds[0])).toMatchObject({
        claimed: false,
        transferredDecks: 0,
      });
      expect(await db.select().from(deckFolder).where(eq(deckFolder.userId, owner))).toHaveLength(
        1,
      );
      expect(
        (await request(other, 'POST', '/youtube/claim', { creatorId: profileId })).status,
      ).toBe(409);
      const steal = await start(other);
      const rejected = await request(
        other,
        'GET',
        `/youtube/callback?state=${steal}&code=${channelIds[0]}`,
      );
      expect(rejected.headers.get('location')).toContain('youtubeError=already_claimed');
      expect((await getDeck(deckIds[0])).userId).toBe(owner);

      // There must be an explicit create choice after Google's consent screen.
      const pending = await callback(newcomer, channelIds[3]);
      if (!('claimId' in pending)) throw new Error('Expected profile confirmation');
      expect(
        await db.select().from(creatorProfile).where(eq(creatorProfile.ownerId, newcomer)),
      ).toHaveLength(0);
      const preview = await service.pendingClaim(newcomer, 'session', pending.claimId);
      expect(preview.channel.id).toBe(channelIds[3]);
      expect(JSON.stringify(preview)).not.toContain('fixture-refresh');
      expect(
        (
          await db
            .select()
            .from(creatorOauthState)
            .where(eq(creatorOauthState.hash, stateHash(pending.claimId)))
        )[0].pendingConnection,
      ).not.toContain('fixture-refresh');
      await expect(service.pendingClaim(other, 'session', pending.claimId)).rejects.toThrow(
        'expired',
      );
      await expect(
        service.confirmClaim(newcomer, 'other-session', pending.claimId, {
          action: 'create',
          name: 'Test',
          slug: 'test',
        }),
      ).rejects.toThrow('expired');
      expect((await request(null, 'GET', `/youtube/claims/${pending.claimId}`)).status).toBe(401);
      await expect(
        service.confirmClaim(newcomer, 'session', pending.claimId, {
          action: 'connect',
          creatorId: profileId,
        }),
      ).rejects.toThrow('cannot manage');
      await service.cancelClaim(newcomer, 'session', pending.claimId);
      await expect(service.pendingClaim(newcomer, 'session', pending.claimId)).rejects.toThrow(
        'expired',
      );
      const fresh = await callback(newcomer, channelIds[3]);
      if (!('claimId' in fresh)) throw new Error('Expected profile confirmation');
      const appeared = await addProfile(channelIds[3]);
      await expect(
        service.confirmClaim(newcomer, 'session', fresh.claimId, {
          action: 'create',
          name: 'New profile',
          slug: `new-${random()}`,
        }),
      ).rejects.toThrow('another creator profile');
      expect(
        (await db.select().from(creatorProfile).where(eq(creatorProfile.id, appeared)))[0].ownerId,
      ).toBeNull();
      await db.delete(creatorProfile).where(eq(creatorProfile.id, appeared));
      const created = await request(newcomer, 'POST', `/youtube/claims/${fresh.claimId}`, {
        action: 'create',
        name: 'My new channel',
        slug: `new-${random()}`,
      });
      expect(created.status).toBe(200);
      const newProfileId = (await created.json()).data.creatorId;
      const [newProfile] = await db
        .select()
        .from(creatorProfile)
        .where(eq(creatorProfile.id, newProfileId));
      expect(newProfile.ownerId).toBe(newcomer);
      expect(newProfile.profile.avatarUrl).toBe('https://example.com/avatar.png');
      expect(
        (
          await request(newcomer, 'POST', `/youtube/claims/${fresh.claimId}`, {
            action: 'create',
            name: 'Replay',
            slug: `replay-${random()}`,
          })
        ).status,
      ).toBe(404);
      // One owned profile gets another channel without creating a duplicate profile.
      expect(await callback(newcomer, channelIds[6])).toMatchObject({
        creatorId: newProfileId,
        claimed: false,
      });
      const multiple = await addProfile(channelIds[6], newcomer);
      const choose = await callback(newcomer, channelIds[4]);
      if (!('claimId' in choose)) throw new Error('Expected profile selection');
      expect(
        (await service.pendingClaim(newcomer, 'session', choose.claimId)).profiles,
      ).toHaveLength(2);
      await expect(
        service.confirmClaim(newcomer, 'session', choose.claimId, {
          action: 'create',
          name: 'Duplicate',
          slug: `dup-${random()}`,
        }),
      ).rejects.toThrow('already have');
      expect(
        await service.confirmClaim(newcomer, 'session', choose.claimId, {
          action: 'connect',
          creatorId: multiple,
        }),
      ).toMatchObject({ creatorId: multiple });

      // Handle-only admin imports can be claimed before the discovery cron resolves them.
      const handleProfile = await addProfile(channelIds[5], null, handle);
      await db
        .insert(creatorChannelResolution)
        .values({ url: handleUrl, channelId: channelIds[6] });
      await expect(callback(handleOwner, channelIds[5], handleProfile)).rejects.toThrow(
        'Choose a YouTube channel',
      );
      expect(
        (await db.select().from(creatorProfile).where(eq(creatorProfile.id, handleProfile)))[0]
          .ownerId,
      ).toBeNull();
      await db.delete(creatorChannelResolution).where(eq(creatorChannelResolution.url, handleUrl));
      expect(await callback(handleOwner, channelIds[5], handleProfile)).toMatchObject({
        creatorId: handleProfile,
        claimed: true,
      });
      const first = await start(other, sharedProfile),
        second = await start(racer, sharedProfile);
      const race = await Promise.allSettled([
        service.callback(other, 'session', first, channelIds[2]),
        service.callback(racer, 'session', second, channelIds[2]),
      ]);
      expect(race.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      expect(race.filter(result => result.status === 'rejected')).toHaveLength(1);
      expect(await getDeck(deckIds[0])).toMatchObject({ userId: owner, public: 2 });
      const expired = await start(owner);
      await db
        .update(creatorOauthState)
        .set({ expiresAt: new Date(Date.now() - 1000).toISOString() })
        .where(eq(creatorOauthState.hash, stateHash(expired)));
      await expect(service.callback(owner, 'session', expired, channelIds[0])).rejects.toThrow(
        'expired',
      );
    } finally {
      globalThis.fetch = originalFetch;
      for (const key of keys) {
        if (originalEnv[key] === undefined) delete process.env[key];
        else process.env[key] = originalEnv[key];
      }
      if (profileIds.length)
        await db.delete(creatorProfile).where(inArray(creatorProfile.id, profileIds));
      await db.delete(creatorChannelResolution).where(eq(creatorChannelResolution.url, handleUrl));
      await db
        .delete(creatorYoutubeChannel)
        .where(inArray(creatorYoutubeChannel.channelId, channelIds));
      if (deckIds.length) {
        await db.delete(creatorImportedDeck).where(inArray(creatorImportedDeck.deckId, deckIds));
        await db.delete(deckCard).where(inArray(deckCard.deckId, deckIds));
        await db.delete(deck).where(inArray(deck.id, deckIds));
      }
      await db.delete(deckFolder).where(eq(deckFolder.id, systemFolderId));
      await db.delete(user).where(inArray(user.id, users));
    }
  },
  30_000,
);
