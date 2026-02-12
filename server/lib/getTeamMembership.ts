import { db } from '../db';
import { teamMember } from '../db/schema/team_member.ts';
import { eq, and } from 'drizzle-orm';

export const getTeamMembership = async (teamId: string, userId: string) => {
  const [membership] = await db
    .select()
    .from(teamMember)
    .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)))
    .limit(1);

  return membership ?? null;
};
