import { desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { tournament } from '../../db/schema/tournament.ts';
import {
  tournamentWeekend,
  tournamentWeekendResource,
  tournamentWeekendTournament,
} from '../../db/schema/tournament_weekend.ts';
import type { AdminResourceSubmissionListItem } from '../../../types/TournamentWeekend.ts';

export async function listResourceSubmissions(): Promise<AdminResourceSubmissionListItem[]> {
  const rows = await db
    .select({
      resource: tournamentWeekendResource,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        location: tournament.location,
        meleeId: tournament.meleeId,
      },
      submitterName: user.displayName,
      weekend: {
        id: tournamentWeekend.id,
        name: tournamentWeekend.name,
        date: tournamentWeekend.date,
      },
    })
    .from(tournamentWeekendResource)
    .innerJoin(tournament, eq(tournament.id, tournamentWeekendResource.tournamentId))
    .leftJoin(user, eq(user.id, tournamentWeekendResource.userId))
    .leftJoin(
      tournamentWeekendTournament,
      eq(tournamentWeekendTournament.tournamentId, tournament.id),
    )
    .leftJoin(
      tournamentWeekend,
      eq(tournamentWeekend.id, tournamentWeekendTournament.tournamentWeekendId),
    )
    .orderBy(
      desc(tournamentWeekendResource.createdAt),
      desc(tournamentWeekendResource.id),
      desc(tournamentWeekend.date),
    );

  // A tournament can belong to multiple weekends or none. Keep each submission
  // exactly once and include resources whose weekend membership was removed.
  const submissions = new Map<string, AdminResourceSubmissionListItem>();
  for (const { weekend, ...row } of rows) {
    let submission = submissions.get(row.resource.id);
    if (!submission) {
      submission = { ...row, weekends: [] };
      submissions.set(row.resource.id, submission);
    }
    if (weekend) submission.weekends.push(weekend);
  }
  return [...submissions.values()];
}
