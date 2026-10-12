import { and, eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../../db/index.ts';
import { deck as deckTable, type Deck } from '../../db/schema/deck.ts';
import { teamDeck } from '../../db/schema/team_deck.ts';
import { teamMember } from '../../db/schema/team_member.ts';
import type { DeckPermissions, DeckReference } from '../../../types/Deck.ts';
import type { DeckDbExecutor } from './deckVersionRepository.ts';
import { deckReadAccess } from './deckFolderAccess.ts';

export function permissionsForDeckReference(
  permissions: DeckPermissions,
  kind: DeckReference['kind'],
): DeckPermissions {
  if (kind === 'parent') return permissions;
  return {
    canRead: permissions.canRead,
    canEditContent: false,
    canSaveVersion: false,
    canEditMetadata: false,
    canChangeVisibility: false,
    canDelete: false,
    canEditAsTeamMember: false,
  };
}

export async function getDeckPermissionsForDecks(
  parents: Deck[],
  actorId: string | null,
  isAdmin = false,
  executor: DeckDbExecutor = db,
): Promise<Map<string, DeckPermissions>> {
  const collaborators = new Set<string>();
  const candidates = parents.filter(
    parent => actorId && parent.userId !== actorId && !parent.cardPoolId,
  );
  // Keep team editing distinct from the separate explicit admin-edit mode.
  if (candidates.length) {
    const actorMembership = alias(teamMember, 'actor_membership');
    const ownerMembership = alias(teamMember, 'owner_membership');
    const rows = await executor
      .select({ deckId: teamDeck.deckId })
      .from(teamDeck)
      .innerJoin(deckTable, eq(deckTable.id, teamDeck.deckId))
      .innerJoin(
        actorMembership,
        and(eq(actorMembership.teamId, teamDeck.teamId), eq(actorMembership.userId, actorId!)),
      )
      .innerJoin(
        ownerMembership,
        and(
          eq(ownerMembership.teamId, teamDeck.teamId),
          eq(ownerMembership.userId, deckTable.userId),
          eq(ownerMembership.allowTeamDeckEdits, true),
        ),
      )
      .where(
        inArray(
          teamDeck.deckId,
          candidates.map(parent => parent.id),
        ),
      );
    for (const row of rows) collaborators.add(row.deckId);
  }
  const readable = new Set(
    parents
      .filter(
        parent =>
          parent.public >= 1 ||
          parent.userId === actorId ||
          isAdmin ||
          collaborators.has(parent.id),
      )
      .map(parent => parent.id),
  );
  const checkFolders = parents.filter(parent => !readable.has(parent.id));
  if (checkFolders.length) {
    const rows = await executor
      .select({ id: deckTable.id })
      .from(deckTable)
      .where(
        and(
          inArray(
            deckTable.id,
            checkFolders.map(parent => parent.id),
          ),
          deckReadAccess(actorId ?? undefined),
        ),
      );
    for (const row of rows) readable.add(row.id);
  }
  return new Map(
    parents.map(parent => {
      const canOwn = parent.userId === actorId || isAdmin;
      const canCollaborate = collaborators.has(parent.id);
      const canEdit = canOwn || canCollaborate;
      return [
        parent.id,
        {
          canRead: readable.has(parent.id),
          canEditContent: !parent.cardPoolId && canEdit,
          canSaveVersion: !parent.cardPoolId && canEdit,
          canEditMetadata: canEdit,
          canChangeVisibility: canOwn,
          canDelete: canOwn,
          canEditAsTeamMember: canCollaborate,
        },
      ];
    }),
  );
}

export async function getDeckPermissions(
  parent: Deck,
  actorId: string | null,
  isAdmin = false,
  referenceKind: DeckReference['kind'] = 'parent',
  executor: DeckDbExecutor = db,
): Promise<DeckPermissions> {
  const permissions = (await getDeckPermissionsForDecks([parent], actorId, isAdmin, executor)).get(
    parent.id,
  )!;
  return permissionsForDeckReference(permissions, referenceKind);
}

export function canReadDeck(_parent: Deck, permissions: DeckPermissions): boolean {
  return permissions.canRead;
}
