import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zTournamentCreateRequest } from '../../../types/ZTournament.ts';
import { db } from '../../db';
import { tournament as tournamentTable } from '../../db/schema/tournament.ts';

export const tournamentPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zTournamentCreateRequest),
  async c => {
    const user = c.get('user');
    const data = c.req.valid('json');
    if (!user) return c.json({ message: 'Unauthorized' }, 401);

    const hasPermission = await auth.api.userHasPermission({
      body: {
        userId: user.id,
        permission: {
          tournament: ['create'],
        },
      },
    });

    if (!hasPermission.success) {
      return c.json(
        {
          message: "You don't have permission to create a deck.",
        },
        403,
      );
    }

    // Convert string date to a Date object if needed
    const dateValue = typeof data.date === 'string' ? new Date(data.date) : data.date;

    const newTournament = await db
      .insert(tournamentTable)
      .values({
        userId: user.id,
        ...data,
        date: dateValue,
        meleeId: data.meleeId || null,
      })
      .returning();

    return c.json({ data: newTournament[0] }, 201);
  },
);
