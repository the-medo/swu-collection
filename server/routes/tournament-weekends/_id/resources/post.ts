import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthExtension } from '../../../../auth/auth.ts';
import { db } from '../../../../db';
import {
  tournamentWeekend,
  tournamentWeekendResource,
  tournamentWeekendTournament,
} from '../../../../db/schema/tournament_weekend.ts';
import {
  getCanonicalMeleeTournamentUrl,
  getCanonicalYoutubeUrl,
  normalizeTournamentWeekendResourceUrl,
} from '../../../../lib/live-tournaments/resourceUrls.ts';
import { createLiveResourcesPatchEvent } from '../../../../lib/live-tournaments/liveTournamentHomeCache.ts';
import { tournament } from '../../../../db/schema/tournament.ts';
import { runResourceSubmissionDiscordAfterSave } from '../../../../lib/discord/resourceSubmissions.ts';
import { createResourceSubmissionRateLimiter } from '../../../../lib/live-tournaments/resourceSubmissionRateLimit.ts';

const checkSubmissionRate = createResourceSubmissionRateLimiter();

const zTournamentWeekendResourceCreateRequest = z
  .object({
    tournamentId: z.guid(),
    resourceType: z.enum(['stream', 'video', 'vod', 'melee']).default('stream'),
    resourceUrl: z.string().trim().min(1).max(2048),
    title: z.string().trim().max(255).optional(),
    description: z.string().trim().max(2000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.resourceType === 'stream' && !getCanonicalYoutubeUrl(value.resourceUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resourceUrl'],
        message: 'Only YouTube links are allowed.',
      });
    }

    if (value.resourceType === 'melee' && !getCanonicalMeleeTournamentUrl(value.resourceUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resourceUrl'],
        message: 'Enter a valid Melee tournament ID or tournament URL.',
      });
    }

    if (value.resourceType === 'video' || value.resourceType === 'vod') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resourceType'],
        message: 'Only stream and melee submissions are supported.',
      });
    }
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

    const retryAfter = checkSubmissionRate(user.id);
    if (retryAfter) {
      c.header('Retry-After', String(retryAfter));
      return c.json({ message: 'Too many resource submissions. Please try again later.' }, 429);
    }

    const data = c.req.valid('json');
    const normalizedResourceUrl = normalizeTournamentWeekendResourceUrl(
      data.resourceType,
      data.resourceUrl,
    );

    if (!normalizedResourceUrl) {
      return c.json({ message: 'Resource URL was not accepted' }, 400);
    }

    const weekendTournament = (
      await db
        .select({
          tournament: {
            id: tournament.id,
            name: tournament.name,
            location: tournament.location,
            date: tournament.date,
          },
          weekend: {
            id: tournamentWeekend.id,
            name: tournamentWeekend.name,
            date: tournamentWeekend.date,
          },
        })
        .from(tournamentWeekendTournament)
        .innerJoin(tournament, eq(tournament.id, tournamentWeekendTournament.tournamentId))
        .innerJoin(
          tournamentWeekend,
          eq(tournamentWeekend.id, tournamentWeekendTournament.tournamentWeekendId),
        )
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
          resourceUrl: normalizedResourceUrl,
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
            resourceUrl: normalizedResourceUrl,
            title: data.title ?? null,
            description: data.description ?? null,
            updatedAt: sql`NOW()`,
          },
        })
        .returning()
    )[0];

    if (resource.approved) {
      await createLiveResourcesPatchEvent('live_resource.upserted', weekendId);
    }

    // This helper catches delivery errors; Discord latency must not delay the 201.
    void runResourceSubmissionDiscordAfterSave({
      resource,
      ...weekendTournament,
      submitter: { id: user.id, displayName: user.displayName },
    });

    return c.json({ data: resource }, 201);
  },
);
