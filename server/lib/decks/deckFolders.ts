import { and, count, eq, inArray, or } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { deck } from '../../db/schema/deck.ts';
import { deckFolder, deckFolderDeck, deckFolderShare } from '../../db/schema/deck_folder.ts';
import { team } from '../../db/schema/team.ts';
import { teamMember } from '../../db/schema/team_member.ts';
import { sharedDeckFolderAccess } from './deckFolderAccess.ts';
import { getDeckFolderDescendants } from '../../../shared/lib/deckFolders.ts';
import type {
  DeckFolderUpdateRequest,
  DeckFolderPositionRequest,
  MoveDecksToFolderRequest,
  DeckFolderSharing,
  DeckFolderSharingRequest,
  SharedDeckFolder,
} from '../../../types/DeckFolder.ts';

export class DeckFolderNotFoundError extends Error {
  constructor() {
    super('Folder not found. Choose another folder and try again.');
  }
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireDeckFolderForCreation(
  tx: Transaction,
  userId: string,
  folderId: string | null | undefined,
) {
  if (!folderId) return;
  // Use the same account lock as folder removal so the destination remains valid until commit.
  await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
  const [destination] = await tx
    .select({ id: deckFolder.id })
    .from(deckFolder)
    .where(and(eq(deckFolder.id, folderId), eq(deckFolder.userId, userId)));
  if (!destination) throw new DeckFolderNotFoundError();
}

const listFolderRows = (userId: string) =>
  db
    .select({
      id: deckFolder.id,
      name: deckFolder.name,
      parentId: deckFolder.parentId,
      position: deckFolder.position,
      deckCount: count(deckFolderDeck.deckId),
    })
    .from(deckFolder)
    .leftJoin(deckFolderDeck, eq(deckFolderDeck.folderId, deckFolder.id))
    .where(eq(deckFolder.userId, userId))
    .groupBy(deckFolder.id)
    .orderBy(deckFolder.position, deckFolder.name, deckFolder.id);

export async function listDeckFolders(userId: string) {
  const folders = await listFolderRows(userId);
  const shares = await db
    .select({
      folderId: deckFolderShare.folderId,
      audience: deckFolderShare.audience,
      teamId: team.id,
      teamName: team.name,
    })
    .from(deckFolderShare)
    .leftJoin(team, eq(team.id, deckFolderShare.teamId))
    .where(eq(deckFolderShare.userId, userId));
  return folders.map(folder => {
    const grants = shares.filter(share => share.folderId === folder.id);
    const sharing: DeckFolderSharing = {
      linkEnabled: grants.some(share => share.audience === 'link'),
      teams: grants.flatMap(share =>
        share.audience === 'team' && share.teamId && share.teamName
          ? [{ id: share.teamId, name: share.teamName }]
          : [],
      ),
    };
    return { ...folder, sharing };
  });
}

export async function getSharedDeckFolder(
  id: string,
  viewerId?: string,
): Promise<SharedDeckFolder | null> {
  const [root] = await db
    .select()
    .from(deckFolder)
    .where(
      and(
        eq(deckFolder.id, id),
        or(
          viewerId ? eq(deckFolder.userId, viewerId) : undefined,
          sharedDeckFolderAccess(id, viewerId),
        ),
      ),
    );
  if (!root) return null;
  const rows = await listFolderRows(root.userId);
  const descendants = getDeckFolderDescendants(rows, root.id);
  // Do not reveal ancestors, siblings, or private team-sharing metadata to visitors.
  return {
    id: root.id,
    name: root.name,
    ownerId: root.userId,
    folders: rows
      .filter(folder => descendants.has(folder.id))
      .map(folder => ({
        ...folder,
        parentId: folder.id === root.id ? null : folder.parentId,
      })),
  };
}

export async function saveDeckFolderSharing(
  userId: string,
  id: string,
  input: DeckFolderSharingRequest,
) {
  return db.transaction(async tx => {
    await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
    const [folder] = await tx
      .select({ id: deckFolder.id })
      .from(deckFolder)
      .where(and(eq(deckFolder.id, id), eq(deckFolder.userId, userId)));
    if (!folder) return 'not_found' as const;
    if (input.teamIds.length) {
      const memberships = await tx
        .select({ id: teamMember.teamId })
        .from(teamMember)
        .where(and(eq(teamMember.userId, userId), inArray(teamMember.teamId, input.teamIds)))
        .for('key share');
      if (memberships.length !== input.teamIds.length) return 'forbidden_team' as const;
    }
    await tx.delete(deckFolderShare).where(eq(deckFolderShare.folderId, id));
    const grants = [
      ...(input.linkEnabled
        ? [{ folderId: id, userId, audience: 'link' as const, teamId: null }]
        : []),
      ...input.teamIds.map(teamId => ({ folderId: id, userId, audience: 'team' as const, teamId })),
    ];
    if (grants.length) await tx.insert(deckFolderShare).values(grants);
    return 'ok' as const;
  });
}

type FolderResult =
  | { status: 'ok'; id: string; parentId: string | null }
  | { status: 'not_found' }
  | { status: 'cycle' };

export async function saveDeckFolder(
  userId: string,
  input: DeckFolderUpdateRequest,
  id?: string,
): Promise<FolderResult> {
  return db.transaction(async tx => {
    // Serialise hierarchy edits per account so concurrent reparenting cannot form a cycle.
    await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
    const folders = await tx.select().from(deckFolder).where(eq(deckFolder.userId, userId));
    const existing = folders.find(folder => folder.id === id);
    if (id && !existing) return { status: 'not_found' };
    const parentId = input.parentId === undefined ? (existing?.parentId ?? null) : input.parentId;
    if (parentId && !folders.some(folder => folder.id === parentId)) return { status: 'not_found' };
    if (id && parentId && getDeckFolderDescendants(folders, id).has(parentId))
      return { status: 'cycle' };
    const position =
      existing && existing.parentId === parentId
        ? existing.position
        : Math.max(
            -1,
            ...folders
              .filter(folder => folder.parentId === parentId)
              .map(folder => folder.position),
          ) + 1;
    if (id) {
      await tx
        .update(deckFolder)
        .set({ name: input.name, parentId, position, updatedAt: new Date() })
        .where(and(eq(deckFolder.id, id), eq(deckFolder.userId, userId)));
      return { status: 'ok', id, parentId };
    }
    const [created] = await tx
      .insert(deckFolder)
      .values({ name: input.name, parentId, position, userId })
      .returning({ id: deckFolder.id });
    return { status: 'ok', id: created!.id, parentId };
  });
}

export async function positionDeckFolder(
  userId: string,
  id: string,
  input: DeckFolderPositionRequest,
): Promise<FolderResult> {
  return db.transaction(async tx => {
    await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
    const folders = await tx
      .select()
      .from(deckFolder)
      .where(eq(deckFolder.userId, userId))
      .orderBy(deckFolder.position, deckFolder.name, deckFolder.id);
    const moving = folders.find(folder => folder.id === id);
    const target = folders.find(folder => folder.id === input.targetId);
    if (!moving || (input.targetId && !target)) return { status: 'not_found' };
    const parentId = target ? (input.placement === 'inside' ? target.id : target.parentId) : null;
    if (target?.id === id || (parentId && getDeckFolderDescendants(folders, id).has(parentId)))
      return { status: 'cycle' };
    const siblings = folders.filter(folder => folder.parentId === parentId && folder.id !== id);
    const index =
      target && input.placement !== 'inside'
        ? siblings.findIndex(folder => folder.id === target.id) +
          (input.placement === 'after' ? 1 : 0)
        : siblings.length;
    siblings.splice(index, 0, moving);
    for (const [position, folder] of siblings.entries()) {
      await tx
        .update(deckFolder)
        .set({ position, ...(folder.id === id ? { parentId, updatedAt: new Date() } : {}) })
        .where(and(eq(deckFolder.id, folder.id), eq(deckFolder.userId, userId)));
    }
    return { status: 'ok', id, parentId };
  });
}

export async function removeDeckFolder(userId: string, id: string) {
  return db.transaction(async tx => {
    await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
    const removed = await tx
      .delete(deckFolder)
      .where(and(eq(deckFolder.id, id), eq(deckFolder.userId, userId)))
      .returning({ id: deckFolder.id });
    // Subfolders and memberships cascade; the decks themselves are preserved.
    return removed.length > 0;
  });
}

export async function moveDecksToFolder(userId: string, input: MoveDecksToFolderRequest) {
  return db.transaction(async tx => {
    await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
    if (input.folderId) {
      const [destination] = await tx
        .select({ id: deckFolder.id })
        .from(deckFolder)
        .where(and(eq(deckFolder.id, input.folderId), eq(deckFolder.userId, userId)));
      if (!destination) return false;
    }
    const owned = await tx
      .select({ id: deck.id })
      .from(deck)
      .where(and(eq(deck.userId, userId), inArray(deck.id, input.deckIds)))
      .orderBy(deck.id)
      .for('update');
    if (owned.length !== input.deckIds.length) return false;
    if (input.folderId) {
      await tx
        .insert(deckFolderDeck)
        .values(input.deckIds.map(deckId => ({ deckId, folderId: input.folderId! })))
        .onConflictDoUpdate({ target: deckFolderDeck.deckId, set: { folderId: input.folderId } });
    } else {
      await tx.delete(deckFolderDeck).where(inArray(deckFolderDeck.deckId, input.deckIds));
    }
    return true;
  });
}
