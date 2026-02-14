import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AuthExtension } from '../../auth/auth.ts';
import { db } from '../../db';
import { gameResult } from '../../db/schema/game_result.ts';
import { teamMember } from '../../db/schema/team_member.ts';
import { eq, and, lte, desc, gt, inArray, getTableColumns } from 'drizzle-orm';
import { team as teamTable } from '../../db/schema/team.ts';
import { getTeamMembership } from '../../lib/getTeamMembership.ts';
import { teamDeck } from '../../db/schema/team_deck.ts';

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const schema = z.object({
  datetimeFrom: z.string().optional(),
  datetimeTo: z.string().optional(),
  teamId: z.string().optional(),
});

const gameResultColumns = getTableColumns(gameResult);

export const gameResultGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', schema),
  async c => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { datetimeFrom, datetimeTo, teamId } = c.req.valid('query');

    if (teamId) {
      // Resolve shortcut to actual team ID if needed
      let resolvedTeamId = teamId;
      if (!isUuid(teamId)) {
        const [teamData] = await db
          .select({ id: teamTable.id })
          .from(teamTable)
          .where(eq(teamTable.shortcut, teamId))
          .limit(1);
        if (!teamData) {
          return c.json({ error: 'Team not found' }, 404);
        }
        resolvedTeamId = teamData.id;
      }

      const membership = await getTeamMembership(resolvedTeamId, user.id);
      if (!membership) {
        return c.json({ error: 'Forbidden' }, 403);
      }

      const teamUserIds = db
        .select({ userId: teamMember.userId })
        .from(teamMember)
        .where(eq(teamMember.teamId, resolvedTeamId));

      let whereClause;
      if (datetimeFrom && datetimeTo) {
        whereClause = and(
          inArray(gameResult.userId, teamUserIds),
          gt(gameResult.createdAt, datetimeFrom),
          lte(gameResult.createdAt, datetimeTo),
        );
      } else if (datetimeFrom) {
        whereClause = and(
          inArray(gameResult.userId, teamUserIds),
          gt(gameResult.updatedAt, datetimeFrom),
        );
      } else {
        whereClause = inArray(gameResult.userId, teamUserIds);
      }

      const results = await db
        .select(gameResultColumns)
        .from(gameResult)
        .innerJoin(teamDeck, eq(gameResult.deckId, teamDeck.deckId))
        .where(whereClause)
        .orderBy(desc(gameResult.createdAt));

      return c.json(results);
    }

    let whereClause;

    if (datetimeFrom && datetimeTo) {
      whereClause = and(
        eq(gameResult.userId, user.id),
        gt(gameResult.createdAt, datetimeFrom),
        lte(gameResult.createdAt, datetimeTo),
      );
    } else if (datetimeFrom) {
      whereClause = and(eq(gameResult.userId, user.id), gt(gameResult.updatedAt, datetimeFrom));
    } else {
      whereClause = eq(gameResult.userId, user.id);
    }

    const results = await db
      .select()
      .from(gameResult)
      .where(whereClause)
      .orderBy(desc(gameResult.createdAt));

    return c.json(results);
  },
);
