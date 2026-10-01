import { and, asc, eq, exists, inArray, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { teamMember } from '../../db/schema/team_member.ts';
import { userTournamentSave } from '../../db/schema/user_tournament_save.ts';
import { tournament } from '../../db/schema/tournament.ts';
import { tournamentMapColumns } from './mapProjection.ts';
import { getTeamMembership } from '../getTeamMembership.ts';
import type {
  CalendarPrivacy,
  SharedTournamentCalendar,
  TeamCalendarEvent,
} from '../../../types/TournamentCalendar.ts';

// These queries deliberately project no save notes, attachments, email or home location.
export const calendarSharingService = {
  async privacy(userId: string) {
    const [row] = await db
      .select({ privacy: user.calendarPrivacy })
      .from(user)
      .where(eq(user.id, userId));
    return row?.privacy ?? null;
  },
  async setPrivacy(userId: string, privacy: CalendarPrivacy) {
    const [row] = await db
      .update(user)
      .set({ calendarPrivacy: privacy })
      .where(eq(user.id, userId))
      .returning({ privacy: user.calendarPrivacy });
    return row ?? null;
  },
  async shared(ownerId: string, viewerId?: string): Promise<SharedTournamentCalendar | null> {
    const ownerTeam = alias(teamMember, 'calendar_owner_team');
    const viewerTeam = alias(teamMember, 'calendar_viewer_team');
    const commonTeam = viewerId
      ? exists(
          db
            .select({ id: ownerTeam.teamId })
            .from(ownerTeam)
            .innerJoin(viewerTeam, eq(viewerTeam.teamId, ownerTeam.teamId))
            .where(and(eq(ownerTeam.userId, user.id), eq(viewerTeam.userId, viewerId))),
        )
      : sql`false`;
    const allowed = and(
      eq(user.id, ownerId),
      or(
        eq(user.calendarPrivacy, 'public'),
        viewerId ? eq(user.id, viewerId) : sql`false`,
        and(eq(user.calendarPrivacy, 'unlisted'), commonTeam),
      ),
    );
    // One statement makes the owner gate and events share the same membership/privacy snapshot.
    const rows = await db
      .select({
        owner: { id: user.id, displayName: user.displayName },
        save: { tournamentId: userTournamentSave.tournamentId, status: userTournamentSave.status },
        tournament: tournamentMapColumns,
      })
      .from(user)
      .leftJoin(userTournamentSave, eq(userTournamentSave.userId, user.id))
      .leftJoin(tournament, eq(tournament.id, userTournamentSave.tournamentId))
      .where(allowed)
      .orderBy(asc(tournament.date), asc(tournament.name), asc(tournament.id));
    if (!rows.length) return null;
    return {
      owner: rows[0].owner,
      events: rows.flatMap(row =>
        row.save && row.tournament
          ? [
              {
                tournamentId: row.save.tournamentId,
                status: row.save.status,
                tournament: row.tournament,
              },
            ]
          : [],
      ),
    };
  },
  async teamEvents(
    teamId: string,
    viewerId: string,
    from: string,
  ): Promise<TeamCalendarEvent[] | null> {
    if (!(await getTeamMembership(teamId, viewerId))) return null;
    const viewerMembership = alias(teamMember, 'event_viewer_membership');
    const rows = await db
      .select({
        tournament: tournamentMapColumns,
        member: {
          userId: user.id,
          displayName: user.displayName,
          image: user.image,
          status: userTournamentSave.status,
        },
      })
      .from(teamMember)
      .innerJoin(user, eq(user.id, teamMember.userId))
      .innerJoin(userTournamentSave, eq(userTournamentSave.userId, user.id))
      .innerJoin(tournament, eq(tournament.id, userTournamentSave.tournamentId))
      .where(
        and(
          eq(teamMember.teamId, teamId),
          // Recheck membership in the actual data query, including concurrent departures.
          exists(
            db
              .select({ id: viewerMembership.userId })
              .from(viewerMembership)
              .where(
                and(eq(viewerMembership.teamId, teamId), eq(viewerMembership.userId, viewerId)),
              ),
          ),
          or(eq(user.id, viewerId), inArray(user.calendarPrivacy, ['unlisted', 'public'])),
          sql`${tournament.date}::date + (greatest(${tournament.days}, 1) - 1) >= ${from}::date`,
        ),
      )
      .orderBy(
        asc(tournament.date),
        asc(tournament.name),
        asc(tournament.id),
        asc(user.displayName),
        asc(user.id),
      );
    const events = new Map<string, TeamCalendarEvent>();
    for (const row of rows) {
      const event = events.get(row.tournament.id) ?? { tournament: row.tournament, members: [] };
      event.members.push(row.member);
      events.set(row.tournament.id, event);
    }
    return [...events.values()];
  },
};
