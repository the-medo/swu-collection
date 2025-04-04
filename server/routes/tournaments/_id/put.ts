import { Hono } from 'hono';
import type { AuthExtension } from '../../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zTournamentUpdateRequest } from '../../../../types/ZTournament.ts';
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { tournament as tournamentTable } from '../../../db/schema/tournament.ts';
import { db } from '../../../db';

export const tournamentIdPutRoute = new Hono<AuthExtension>().put(
  '/',
  zValidator('json', zTournamentUpdateRequest),
  async c => {
    const paramTournamentId = z.string().uuid().parse(c.req.param('id'));
    const data = c.req.valid('json');
    const user = c.get('user');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const isOwner = eq(tournamentTable.userId, user.id);
    const tournamentId = eq(tournamentTable.id, paramTournamentId);

    // Convert string date to a Date object if needed
    const dateValue = data.date
      ? typeof data.date === 'string'
        ? new Date(data.date)
        : data.date
      : undefined;

    const updateData = {
      ...data,
      date: dateValue,
      updatedAt: sql`NOW()`,
    };

    const updatedTournament = (
      await db.update(tournamentTable).set(updateData).where(and(isOwner, tournamentId)).returning()
    )[0];

    if (!updatedTournament) {
      return c.json(
        {
          message: "Tournament doesn't exist or you don't have permission to update it",
        },
        404,
      );
    }

    return c.json({ data: updatedTournament });
  },
);
