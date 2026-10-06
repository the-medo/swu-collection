import { expect, test } from 'bun:test';
import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckInformation } from '../../db/schema/deck_information.ts';
import { deckFolder, deckFolderDeck, deckFolderShare } from '../../db/schema/deck_folder.ts';
import { team } from '../../db/schema/team.ts';
import { teamMember } from '../../db/schema/team_member.ts';
import { deckFoldersRoute } from '../../routes/deck-folders.ts';
import { deckRoute } from '../../routes/deck.ts';

const enabled = process.env.SWUBASE_DECK_FOLDERS_DB_TEST === '1';
if (enabled) {
  const url = new URL(process.env.DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || !url.pathname.startsWith('/swubase_'))
    throw new Error('Sharing tests require an isolated worktree database.');
}

test.skipIf(!enabled)(
  'folder sharing inherits access, isolates subtrees and revokes link/team access',
  async () => {
    const [ownerId, memberId, outsiderId] = Array.from({ length: 3 }, () =>
      crypto.randomUUID(),
    ) as [string, string, string];
    const userIds = [ownerId, memberId, outsiderId];
    const [rootId, childId, leafId, siblingId] = Array.from({ length: 4 }, () =>
      crypto.randomUUID(),
    ) as [string, string, string, string];
    const teamId = crypto.randomUUID();
    const foreignTeamId = crypto.randomUUID();
    const deckIds = Array.from({ length: 26 }, () => crypto.randomUUID());
    const app = (id?: string) =>
      new Hono<AuthExtension>()
        .use('*', async (c, next) => {
          c.set('user', id ? ({ id } as NonNullable<AuthExtension['Variables']['user']>) : null);
          await next();
        })
        .route('/folders', deckFoldersRoute)
        .route('/deck', deckRoute);
    const owner = app(ownerId),
      member = app(memberId),
      outsider = app(outsiderId),
      anonymous = app();
    const share = (
      target: ReturnType<typeof app>,
      id: string,
      linkEnabled: boolean,
      teamIds: string[] = [],
    ) =>
      target.request(`/folders/${id}/sharing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkEnabled, teamIds }),
      });
    const contents = (target: ReturnType<typeof app>, root = rootId, folder = leafId, offset = 0) =>
      target.request(`/deck?sharedFolderId=${root}&folderId=${folder}&limit=20&offset=${offset}`);
    const accessible = async (target: ReturnType<typeof app>, status: number) => {
      for (const suffix of ['', '/card', '/json'])
        expect((await target.request(`/deck/${deckIds[0]}${suffix}`)).status).toBe(status);
      const bulk = await (
        await target.request(`/deck/bulk/data?ids=${deckIds[0]},${deckIds[25]}`)
      ).json();
      expect(Object.keys(bulk.decks)).toEqual(status === 200 ? [deckIds[0]!] : []);
    };
    await db.insert(user).values(
      userIds.map(id => ({
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
      await db.insert(team).values([
        { id: teamId, name: 'Shared folder team' },
        { id: foreignTeamId, name: 'Other private team' },
      ]);
      await db.insert(teamMember).values([
        { teamId, userId: ownerId, role: 'owner' },
        { teamId, userId: memberId },
        { teamId: foreignTeamId, userId: outsiderId, role: 'owner' },
      ]);
      await db.insert(deckFolder).values([
        { id: rootId, userId: ownerId, name: 'Shared root' },
        { id: siblingId, userId: ownerId, name: 'Private sibling' },
      ]);
      await db
        .insert(deckFolder)
        .values({ id: childId, userId: ownerId, parentId: rootId, name: 'Child' });
      await db
        .insert(deckFolder)
        .values({ id: leafId, userId: ownerId, parentId: childId, name: 'Leaf' });
      await db.insert(deck).values(
        deckIds.map((id, index) => ({
          id,
          userId: ownerId,
          format: 1,
          name: `Private sharing deck ${index}`,
          public: 0,
        })),
      );
      await db.insert(deckInformation).values(deckIds.map(deckId => ({ deckId })));
      await db
        .insert(deckFolderDeck)
        .values(
          deckIds.map((deckId, index) => ({ deckId, folderId: index === 25 ? siblingId : leafId })),
        );

      expect((await owner.request(`/folders/${rootId}`)).status).toBe(200);
      expect((await anonymous.request(`/folders/${rootId}`)).status).toBe(404);
      expect((await share(anonymous, rootId, true)).status).toBe(401);
      expect((await share(outsider, rootId, true)).status).toBe(404);
      expect((await share(owner, rootId, false, [foreignTeamId])).status).toBe(403);
      expect((await share(owner, rootId, false, [teamId, teamId])).status).toBe(400);
      expect((await owner.request('/folders/invalid')).status).toBe(400);
      await accessible(anonymous, 404);

      expect((await share(owner, rootId, true)).status).toBe(200);
      const response = await anonymous.request(`/folders/${rootId}`);
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
      const tree = (await response.json()).data;
      expect(tree.folders.map((folder: { id: string }) => folder.id).sort()).toEqual(
        [rootId, childId, leafId].sort(),
      );
      expect(tree.folders.every((folder: Record<string, unknown>) => !('sharing' in folder))).toBe(
        true,
      );
      expect((await anonymous.request(`/folders/${leafId}`)).status).toBe(200);
      expect((await anonymous.request(`/folders/${siblingId}`)).status).toBe(404);
      const firstPage = await (await contents(anonymous)).json();
      expect(firstPage.data).toHaveLength(20);
      expect(firstPage.pagination.hasMore).toBe(true);
      expect((await (await contents(anonymous, rootId, leafId, 20)).json()).data).toHaveLength(5);
      expect((await contents(anonymous, rootId, siblingId)).status).toBe(404);
      expect(
        (await anonymous.request(`/deck?sharedFolderId=${rootId}&folderId=unfiled`)).status,
      ).toBe(404);
      expect((await anonymous.request(`/deck?sharedFolderId=${rootId}`)).status).toBe(404);
      expect(
        (
          await anonymous.request(
            `/deck?sharedFolderId=${rootId}&folderId=${leafId}&userId=${outsiderId}`,
          )
        ).status,
      ).toBe(404);
      expect(
        (await (await anonymous.request('/deck')).json()).data.some(
          (row: { deck: { id: string } }) => deckIds.includes(row.deck.id),
        ),
      ).toBe(false);
      await accessible(anonymous, 200);
      expect(
        (
          await outsider.request(`/deck/${deckIds[0]}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Cannot edit shared deck' }),
          })
        ).status,
      ).toBe(404);
      expect(
        (
          await outsider.request(`/folders/${rootId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Cannot edit shared folder' }),
          })
        ).status,
      ).toBe(404);

      expect((await share(owner, rootId, false)).status).toBe(200);
      await accessible(anonymous, 404);
      expect((await contents(anonymous)).status).toBe(404);
      expect((await share(owner, childId, true)).status).toBe(200);
      expect((await anonymous.request(`/folders/${rootId}`)).status).toBe(404);
      expect((await anonymous.request(`/folders/${childId}`)).status).toBe(200);
      await accessible(anonymous, 200);
      expect(
        (
          await owner.request(`/folders/${leafId}/position`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetId: siblingId, placement: 'inside' }),
          })
        ).status,
      ).toBe(200);
      await accessible(anonymous, 404);
      expect((await contents(anonymous, childId, leafId)).status).toBe(404);
      expect(
        (
          await owner.request(`/folders/${leafId}/position`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetId: childId, placement: 'inside' }),
          })
        ).status,
      ).toBe(200);
      expect((await share(owner, childId, false)).status).toBe(200);

      expect((await share(owner, rootId, true, [teamId])).status).toBe(200);
      expect((await share(owner, rootId, false, [teamId])).status).toBe(200);
      expect((await anonymous.request(`/folders/${rootId}`)).status).toBe(404);
      expect((await outsider.request(`/folders/${rootId}`)).status).toBe(404);
      expect((await member.request(`/folders/${rootId}`)).status).toBe(200);
      expect((await contents(member)).status).toBe(200);
      await accessible(member, 200);
      expect((await share(member, rootId, true)).status).toBe(404);
      expect((await share(owner, rootId, true, [foreignTeamId])).status).toBe(403);
      expect((await anonymous.request(`/folders/${rootId}`)).status).toBe(404);
      await db.delete(teamMember).where(eq(teamMember.userId, memberId));
      expect((await member.request(`/folders/${rootId}`)).status).toBe(404);
      await accessible(member, 404);
      await db.insert(teamMember).values({ teamId, userId: memberId });
      await db.delete(teamMember).where(eq(teamMember.userId, ownerId));
      expect(
        await db.select().from(deckFolderShare).where(eq(deckFolderShare.folderId, rootId)),
      ).toHaveLength(0);
      expect((await member.request(`/folders/${rootId}`)).status).toBe(404);
      await accessible(member, 404);
      expect((await share(owner, rootId, true)).status).toBe(200);
      expect((await owner.request(`/folders/${rootId}`, { method: 'DELETE' })).status).toBe(200);
      expect((await anonymous.request(`/folders/${leafId}`)).status).toBe(404);
      await accessible(anonymous, 404);
      expect(await db.select().from(deck).where(inArray(deck.id, deckIds))).toHaveLength(26);
    } finally {
      await db.delete(deckFolder).where(eq(deckFolder.userId, ownerId));
      await db.delete(deckInformation).where(inArray(deckInformation.deckId, deckIds));
      await db.delete(deck).where(inArray(deck.id, deckIds));
      await db.delete(team).where(inArray(team.id, [teamId, foreignTeamId]));
      await db.delete(user).where(inArray(user.id, userIds));
    }
  },
  30000,
);
