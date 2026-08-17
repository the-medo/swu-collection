import { and, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../../db/index.ts';
import type { Deck } from '../../db/schema/deck.ts';
import { teamDeck } from '../../db/schema/team_deck.ts';
import { teamMember } from '../../db/schema/team_member.ts';
import type { DeckPermissions, DeckReference } from '../../../types/Deck.ts';
import type { DeckDbExecutor } from './deckVersionRepository.ts';

export async function getDeckPermissions(
  parent: Deck,
  actorId: string | null,
  isAdmin = false,
  referenceKind: DeckReference['kind'] = 'parent',
  executor: DeckDbExecutor = db,
): Promise<DeckPermissions> {
  const isParent = referenceKind === 'parent';
  const isOwner = actorId === parent.userId;
  let isCollaborator = false;

  if (actorId && !isOwner && !isAdmin && !parent.cardPoolId) {
    const actorMembership = alias(teamMember, 'actor_membership');
    const ownerMembership = alias(teamMember, 'owner_membership');
    isCollaborator = Boolean(
      (
        await executor
          .select({ teamId: teamDeck.teamId })
          .from(teamDeck)
          .innerJoin(
            actorMembership,
            and(eq(actorMembership.teamId, teamDeck.teamId), eq(actorMembership.userId, actorId)),
          )
          .innerJoin(
            ownerMembership,
            and(
              eq(ownerMembership.teamId, teamDeck.teamId),
              eq(ownerMembership.userId, parent.userId),
              eq(ownerMembership.allowTeamDeckEdits, true),
            ),
          )
          .where(eq(teamDeck.deckId, parent.id))
          .limit(1)
      )[0],
    );
  }

  const canOwn = isParent && (isOwner || isAdmin);
  const canCollaborate = isParent && isCollaborator;
  const canEdit = canOwn || canCollaborate;

  return {
    canEditContent: canEdit,
    canSaveVersion: !parent.cardPoolId && canEdit,
    canEditMetadata: canEdit,
    canChangeVisibility: canOwn,
    canDelete: canOwn,
  };
}

export function canReadDeck(parent: Deck, permissions: DeckPermissions): boolean {
  return parent.public >= 1 || permissions.canEditContent || permissions.canDelete;
}
