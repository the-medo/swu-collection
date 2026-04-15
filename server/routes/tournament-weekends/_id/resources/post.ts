import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import {
  tournamentWeekendResource,
  tournamentWeekendTournament,
} from '../../../../db/schema/tournament_weekend.ts';

const isAllowedStreamUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return false;
    }

    const hostname = url.hostname.toLowerCase();
    return (
      hostname === 'youtu.be' ||
      hostname === 'youtube.com' ||
      hostname.endsWith('.youtube.com') ||
      hostname === 'twitch.tv' ||
      hostname.endsWith('.twitch.tv')
    );
  } catch {
    return false;
  }
};

const zTournamentWeekendResourceCreateRequest = z.object({
  tournamentId: z.guid(),
  resourceType: z.enum(['stream', 'video', 'vod']).default('stream'),
  resourceUrl: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine(isAllowedStreamUrl, 'Only YouTube and Twitch links are allowed.'),
  title: z.string().trim().max(255).optional(),
  description: z.string().trim().max(2000).optional(),
});

export const tournamentWeekendIdResourcesPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zTournamentWeekendResourceCreateRequest),
  async c => {
    const weekendId = z.guid().parse(c.req.param('id'));
    const user = c.get('user');
    if (!user) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    const data = c.req.valid('json');
    const weekendTournament = (
      await db
        .select({ tournamentId: tournamentWeekendTournament.tournamentId })
        .from(tournamentWeekendTournament)
        .where(
          and(
            eq(tournamentWeekendTournament.tournamentWeekendId, weekendId),
            eq(tournamentWeekendTournament.tournamentId, data.tournamentId),
          ),
        )
        .limit(1)
    )[0];

    if (!weekendTournament) {
      return c.json({ message: 'Tournament not found in this weekend' }, 404);
    }

    const resource = (
      await db
        .insert(tournamentWeekendResource)
        .values({
          tournamentId: data.tournamentId,
          userId: user.id,
          resourceType: data.resourceType,
          resourceUrl: data.resourceUrl,
          title: data.title ?? null,
          description: data.description ?? null,
          approved: false,
          updatedAt: sql`NOW()`,
        })
        .onConflictDoUpdate({
          target: [
            tournamentWeekendResource.tournamentId,
            tournamentWeekendResource.resourceType,
            tournamentWeekendResource.resourceUrl,
          ],
          set: {
            userId: user.id,
            title: data.title ?? null,
            description: data.description ?? null,
            updatedAt: sql`NOW()`,
          },
        })
        .returning()
    )[0];

    return c.json({ data: resource }, 201);
  },
);
