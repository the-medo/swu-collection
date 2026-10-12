import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckCard } from '../../db/schema/deck_card.ts';
import { deckVersion, deckVersionCard } from '../../db/schema/deck_version.ts';
import { deckFolder, deckFolderDeck, deckFolderShare } from '../../db/schema/deck_folder.ts';
import { team } from '../../db/schema/team.ts';
import { teamMember } from '../../db/schema/team_member.ts';
import { teamDeck } from '../../db/schema/team_deck.ts';
import { deckRoute } from '../../routes/deck.ts';
import { saveDeckVersion } from './saveDeckVersion.ts';
import { getDeckVersionId } from './getDeckVersionId.ts';
import { patchTeamMember } from '../teams/membership.ts';

const enabled = process.env.SWUBASE_DECK_VERSION_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Version tests require an isolated worktree database.');
}

test.skipIf(!enabled)(
  'versions preserve private/folder access, safe responses and team editing',
  async () => {
    const [ownerId, memberId] = [crypto.randomUUID(), crypto.randomUUID()];
    const deckId = crypto.randomUUID();
    const folderId = crypto.randomUUID();
    const teamId = crypto.randomUUID();
    const app = (id?: string) =>
      new Hono<AuthExtension>()
        .use('*', async (c, next) => {
          c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
          await next();
        })
        .route('/deck', deckRoute);
    const owner = app(ownerId),
      anonymous = app();
    await db.insert(user).values(
      [ownerId, memberId].map(id => ({
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
    try {
      await db
        .insert(deck)
        .values({ id: deckId, userId: ownerId, format: 1, name: 'Version rebase test', public: 0 });
      await db.insert(deckCard).values([
        { deckId, cardId: 'test-main', board: 1, quantity: 2 },
        { deckId, cardId: 'test-side', board: 2, quantity: 1 },
        { deckId, cardId: 'test-maybe', board: 3, quantity: 3 },
      ]);
      const firstResponse = await owner.request(`/deck/${deckId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      expect(firstResponse.status).toBe(201);
      const first = (await firstResponse.json()).data;
      const sealedId = first.sealedVersion.id;
      const openId = first.openVersion.id;
      for (const id of [deckId, sealedId, openId]) {
        for (const suffix of ['', '/card', '/versions', `/versions/${sealedId}/diff`]) {
          expect((await owner.request(`/deck/${id}${suffix}`)).status).toBe(200);
          expect((await anonymous.request(`/deck/${id}${suffix}`)).status).toBe(404);
        }
      }
      const sealedCards = await (await owner.request(`/deck/${sealedId}/card`)).json();
      expect(sealedCards.data.map((card: { board: number }) => card.board)).toEqual([1, 2]);
      expect((await getDeckVersionId({ deckId })).deckVersionId).toBe(sealedId);
      await db
        .update(deckCard)
        .set({ quantity: 4 })
        .where(and(eq(deckCard.deckId, deckId), eq(deckCard.cardId, 'test-maybe')));
      expect((await getDeckVersionId({ deckId })).deckVersionId).toBe(sealedId);
      await expect(saveDeckVersion({ deckId, actorId: ownerId })).rejects.toMatchObject({
        code: 'NO_VERSION_CHANGES',
      });
      await db
        .insert(deckFolder)
        .values({ id: folderId, userId: ownerId, name: 'Shared versions' });
      await db.insert(deckFolderDeck).values({ deckId, folderId });
      await db.insert(deckFolderShare).values({ folderId, userId: ownerId, audience: 'link' });
      for (const id of [deckId, sealedId, openId])
        expect((await anonymous.request(`/deck/${id}`)).status).toBe(200);
      const response = await anonymous.request(
        `/deck/bulk/data?ids=${deckId},${sealedId},${openId}`,
      );
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
      const bulk = await response.json();
      expect(Object.keys(bulk.decks).length).toBe(3);
      for (const entry of Object.values(bulk.decks) as Array<{ user: Record<string, unknown> }>) {
        expect(entry.user).not.toHaveProperty('email');
        expect(entry.user).not.toHaveProperty('emailVerified');
      }
      await db.delete(deckFolderShare).where(eq(deckFolderShare.folderId, folderId));
      expect((await anonymous.request(`/deck/${sealedId}`)).status).toBe(404);
      await db.insert(team).values({ id: teamId, name: 'Version editors' });
      await db.insert(teamMember).values([
        { teamId, userId: ownerId, role: 'owner' },
        { teamId, userId: memberId },
      ]);
      await db.insert(teamDeck).values({ teamId, deckId });
      expect(
        (await patchTeamMember(teamId, memberId, ownerId, { allowTeamDeckEdits: true })).status,
      ).toBe(403);
      expect(
        (await patchTeamMember(teamId, ownerId, ownerId, { allowTeamDeckEdits: true })).status,
      ).toBe(200);
      const member = app(memberId);
      expect((await member.request(`/deck/${sealedId}`)).status).toBe(200);
      const update = await member.request(`/deck/${deckId}/card`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: { deckId, cardId: 'test-main', board: 1 },
          data: { quantity: 3 },
        }),
      });
      expect(update.status).toBe(201);
      const saveResponse = await member.request(`/deck/${deckId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      expect(saveResponse.status).toBe(201);
      const saved = (await saveResponse.json()).data;
      expect(saved.sealedVersion.id).toBe(openId);
      expect(saved.sealedVersion.sealedByUserId).toBe(memberId);
      const oldCards = (await (await owner.request(`/deck/${sealedId}/card`)).json()).data;
      expect(
        oldCards.find((card: { cardId: string }) => card.cardId === 'test-main').quantity,
      ).toBe(2);
      const delta = await db
        .select()
        .from(deckVersionCard)
        .where(eq(deckVersionCard.deckVersionId, openId));
      expect(delta).toHaveLength(1);
      expect(delta[0]?.quantity).toBe(3);
      expect(
        (await patchTeamMember(teamId, ownerId, ownerId, { allowTeamDeckEdits: false })).status,
      ).toBe(200);
      expect((await member.request(`/deck/${sealedId}`)).status).toBe(404);
      const sanitizer = await Bun.file('scripts/remote-dev/sql/001-core-data.sql').text();
      const historyCleanup = sanitizer.match(
        /-- Historical copies[\s\S]*?(?=-- Tournament data is globally useful)/,
      )?.[0];
      expect(historyCleanup).toBeDefined();
      await db.transaction(async tx => {
        await tx.execute(
          'CREATE TEMP TABLE development_cleanup_user (user_id text, retain_data boolean) ON COMMIT DROP',
        );
        await tx.execute(sql`INSERT INTO development_cleanup_user VALUES (${ownerId}, true)`);
        await tx
          .update(deckVersion)
          .set({ description: 'Private history', changeNote: 'Private change' })
          .where(eq(deckVersion.id, sealedId));
        await tx
          .update(deckVersionCard)
          .set({ note: 'Private card note' })
          .where(eq(deckVersionCard.deckVersionId, sealedId));
        for (const statement of historyCleanup!.split(';').filter(part => part.trim()))
          await tx.execute(statement);
        const [version] = await tx.select().from(deckVersion).where(eq(deckVersion.id, sealedId));
        expect(version?.description).toBe('');
        expect(version?.changeNote).toBeNull();
        expect(version?.contentHash).toBeNull();
        const cards = await tx
          .select()
          .from(deckVersionCard)
          .where(eq(deckVersionCard.deckVersionId, sealedId));
        expect(cards.every(card => card.note === '')).toBe(true);
      });
    } finally {
      await db.delete(team).where(eq(team.id, teamId));
      await db.delete(deckFolder).where(eq(deckFolder.id, folderId));
      await db.delete(deckCard).where(eq(deckCard.deckId, deckId));
      await db.delete(deck).where(eq(deck.id, deckId));
      await db.delete(user).where(inArray(user.id, [ownerId, memberId]));
    }
  },
  30_000,
);
