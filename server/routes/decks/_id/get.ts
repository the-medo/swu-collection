import { Hono } from 'hono';
import { z } from 'zod';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { deck as deckTable } from '../../../db/schema/deck.ts';
import { db } from '../../../db';
import { selectUser } from '../../user.ts';
import { user as userTable } from '../../../db/schema/auth-schema.ts';
import { selectDeck } from '../../deck.ts';
import { userDeckFavorite } from '../../../db/schema/user_deck_favorite.ts';
import { selectEntityPricesArrayFor } from '../../../lib/entity-prices/selectEntityPrices.ts';
import type { AuthExtension } from '../../../auth/auth.ts';
import { deckBranch } from '../../../db/schema/deck_branch.ts';
import { deckChangeRequest } from '../../../db/schema/deck_change_request.ts';
import { team as teamTable } from '../../../db/schema/team.ts';
import {
  canViewDeck,
  getDeckBranchContext,
  isAdminUser,
} from '../../../lib/decks/deckBranchAccess.ts';

export const deckIdGetRoute = new Hono<AuthExtension>().get('/', async c => {
  const paramDeckId = z.guid().parse(c.req.param('id'));
  const user = c.get('user');
  const isAdmin = await isAdminUser(user?.id);

  // Start with the base query
  let query = db
    .select({
      user: selectUser,
      deck: selectDeck,
      isFavorite: user ? userDeckFavorite.createdAt : sql.raw('NULL'),
      entityPrices: selectEntityPricesArrayFor(deckTable.id),
    })
    .from(deckTable)
    .innerJoin(userTable, eq(deckTable.userId, userTable.id))
    .$dynamic();

  // Only add the left join if the user is logged in
  if (user) {
    query = query.leftJoin(
      userDeckFavorite,
      and(eq(userDeckFavorite.userId, user.id), eq(userDeckFavorite.deckId, deckTable.id)),
    );
  }

  query = query.where(eq(deckTable.id, paramDeckId));

  const deckData = (await query)[0];

  if (!deckData || !(await canViewDeck(deckData.deck, user?.id, isAdmin))) {
    return c.json({ message: "Deck doesn't exist" }, 404);
  }

  const branchContext = await getDeckBranchContext(paramDeckId);
  const openBranchRows =
    deckData.deck.userId === user?.id || isAdmin
      ? await db
          .select({
            teamId: teamTable.id,
            teamName: teamTable.name,
            teamShortcut: teamTable.shortcut,
            count: count(deckBranch.id),
          })
          .from(deckBranch)
          .innerJoin(teamTable, eq(deckBranch.teamId, teamTable.id))
          .where(and(eq(deckBranch.baseDeckId, paramDeckId), eq(deckBranch.status, 'open')))
          .groupBy(teamTable.id, teamTable.name, teamTable.shortcut)
          .orderBy(desc(count(deckBranch.id)))
      : [];
  const openBranchCount = openBranchRows.reduce((total, row) => total + Number(row.count), 0);
  const [openChangeRequestRow] =
    deckData.deck.userId === user?.id || isAdmin
      ? await db
          .select({
            count: count(deckChangeRequest.id),
          })
          .from(deckChangeRequest)
          .where(
            and(
              eq(deckChangeRequest.baseDeckId, paramDeckId),
              eq(deckChangeRequest.status, 'open'),
            ),
          )
      : [{ count: 0 }];

  return c.json({
    ...deckData,
    openBranchCount,
    openChangeRequestCount: Number(openChangeRequestRow.count),
    openBranchTeams: openBranchRows.map(row => ({
      teamId: row.teamId,
      teamName: row.teamName,
      teamShortcut: row.teamShortcut,
      count: Number(row.count),
    })),
    branchContext: branchContext
      ? {
          branch: branchContext.branch,
          baseDeck: branchContext.baseDeck,
          team: {
            id: branchContext.team.id,
            name: branchContext.team.name,
            shortcut: branchContext.team.shortcut,
          },
          changeRequest: branchContext.changeRequest
            ? {
                id: branchContext.changeRequest.id,
                title: branchContext.changeRequest.title,
                description: branchContext.changeRequest.description,
                status: branchContext.changeRequest.status,
                createdAt: branchContext.changeRequest.createdAt,
                updatedAt: branchContext.changeRequest.updatedAt,
              }
            : null,
        }
      : null,
  });
});
