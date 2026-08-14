import { and, eq } from 'drizzle-orm';
import { auth } from '../../auth/auth.ts';
import { db } from '../../db';
import { deck as deckTable, type Deck } from '../../db/schema/deck.ts';
import { deckBranch, type DeckBranch } from '../../db/schema/deck_branch.ts';
import {
  deckChangeRequest,
  type DeckChangeRequest,
} from '../../db/schema/deck_change_request.ts';
import { team, type Team } from '../../db/schema/team.ts';
import { getTeamMembership } from '../getTeamMembership.ts';

export type DeckBranchContext = {
  branch: DeckBranch;
  baseDeck: Deck;
  team: Team;
  changeRequest: DeckChangeRequest | null;
};

export async function isAdminUser(userId: string | undefined | null) {
  if (!userId) return false;

  const result = await auth.api.userHasPermission({
    body: {
      userId,
      permission: {
        admin: ['access'],
      },
    },
  });

  return result.success;
}

export async function getDeckBranchContext(deckId: string): Promise<DeckBranchContext | null> {
  const [row] = await db
    .select({
      branch: deckBranch,
      baseDeck: deckTable,
      team,
    })
    .from(deckBranch)
    .innerJoin(deckTable, eq(deckBranch.baseDeckId, deckTable.id))
    .innerJoin(team, eq(deckBranch.teamId, team.id))
    .where(eq(deckBranch.branchDeckId, deckId))
    .limit(1);

  if (!row) return null;

  const [request] = await db
    .select()
    .from(deckChangeRequest)
    .where(and(eq(deckChangeRequest.branchId, row.branch.id), eq(deckChangeRequest.status, 'open')))
    .limit(1);

  return {
    branch: row.branch,
    baseDeck: row.baseDeck,
    team: row.team,
    changeRequest: request ?? null,
  };
}

export async function canViewDeck(deck: Deck, userId: string | undefined | null, isAdmin = false) {
  if (isAdmin || deck.public >= 1 || deck.userId === userId) return true;
  if (!userId) return false;

  const context = await getDeckBranchContext(deck.id);
  if (!context) return false;

  if (context.baseDeck.userId === userId || context.branch.creatorUserId === userId) return true;

  return !!(await getTeamMembership(context.branch.teamId, userId));
}

export async function canEditDeck(deck: Deck, userId: string | undefined | null, isAdmin = false) {
  if (!userId && !isAdmin) return false;

  const context = await getDeckBranchContext(deck.id);
  if (context) {
    if (context.branch.status !== 'open') return false;
    return isAdmin || context.branch.creatorUserId === userId;
  }

  return isAdmin || deck.userId === userId;
}

export async function assertDeckEditable(deckId: string, userId: string, isAdmin = false) {
  const [deck] = await db.select().from(deckTable).where(eq(deckTable.id, deckId)).limit(1);
  if (!deck) return { ok: false as const, status: 404 as const, message: "Deck doesn't exist" };

  const editable = await canEditDeck(deck, userId, isAdmin);
  if (!editable) return { ok: false as const, status: 403 as const, message: 'Unauthorized' };

  return { ok: true as const, deck };
}
