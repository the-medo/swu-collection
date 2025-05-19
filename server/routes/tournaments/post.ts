import { Hono } from 'hono';
import { auth, type AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { zTournamentCreateRequest } from '../../../types/ZTournament.ts';
import { db } from '../../db';
import { tournament as tournamentTable } from '../../db/schema/tournament.ts';
import { generateTournamentThumbnail } from '../../lib/tournaments/generateTournamentThumbnail.ts';

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

    // Generate tournament thumbnail
    try {
      await generateTournamentThumbnail({
        id: newTournament[0].id,
        type: newTournament[0].type,
        name: newTournament[0].name,
        date: newTournament[0].date,
        attendance: newTournament[0].attendance,
        countryCode: newTournament[0].location
      });
    } catch (error) {
      console.error('Error generating tournament thumbnail:', error);
      // Don't fail the request if thumbnail generation fails
    }

    return c.json({ data: newTournament[0] }, 201);
  },
);
