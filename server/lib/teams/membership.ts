import { and, eq, ne } from 'drizzle-orm';
import { db } from '../../db';
import { team } from '../../db/schema/team.ts';
import { teamMember } from '../../db/schema/team_member.ts';
import { teamJoinRequest } from '../../db/schema/team_join_request.ts';
import { teamHeader } from '../../db/schema/team_header.ts';
import { cleanupHeaderObject } from '../headers/storage.ts';
import { createUserFileStorage, type UserFileObjectStorage } from '../user-files/storage.ts';
import {
  createNotifications,
  retractUnseenNotifications,
  type NotificationTransaction,
} from '../notifications/write.ts';
import { notifyUser } from '../notifications/publish.ts';

async function lockMembership(tx: NotificationTransaction, teamId: string, userId: string) {
  // All membership edits and team deletion share this lock, so recipients reflect team history.
  // Hold the owner's role stable until the operation commits, too.
  await tx.select({ id: team.id }).from(team).where(eq(team.id, teamId)).for('no key update');
  const [membership] = await tx
    .select()
    .from(teamMember)
    .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)))
    .for('share');
  return membership;
}

export async function handleJoinRequest(
  teamId: string,
  requestId: string,
  ownerId: string,
  status: 'approved' | 'rejected',
) {
  return db.transaction(async tx => {
    if ((await lockMembership(tx, teamId, ownerId))?.role !== 'owner')
      return { status: 403 as const, message: 'Only team owners can handle join requests' };
    const [request] = await tx
      .update(teamJoinRequest)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(teamJoinRequest.id, requestId),
          eq(teamJoinRequest.teamId, teamId),
          eq(teamJoinRequest.status, 'pending'),
        ),
      )
      .returning();
    if (!request)
      return { status: 404 as const, message: 'Join request not found or already handled' };

    if (status === 'approved') {
      const inserted = await tx
        .insert(teamMember)
        .values({ teamId, userId: request.userId, role: 'member' })
        .onConflictDoNothing()
        .returning();
      if (inserted.length) {
        const recipients = await tx
          .select({ userId: teamMember.userId })
          .from(teamMember)
          .where(and(eq(teamMember.teamId, teamId), ne(teamMember.userId, request.userId)));
        await createNotifications(
          tx,
          recipients.map(recipient => ({
            recipientUserId: recipient.userId,
            actorUserId: request.userId,
            type: 'team.member.joined',
            entityType: 'team',
            entityId: teamId,
            dedupeKey: `team.member.joined:${requestId}`,
          })),
        );
      }
    }
    return { status: 200 as const, data: request };
  });
}

export async function removeTeamMember(teamId: string, userId: string, ownerId: string) {
  return db.transaction(async tx => {
    if ((await lockMembership(tx, teamId, ownerId))?.role !== 'owner')
      return { status: 403 as const, message: 'Only owners can remove members' };
    const members = await tx
      .select({ userId: teamMember.userId })
      .from(teamMember)
      .where(eq(teamMember.teamId, teamId));
    if (userId === ownerId && members.length <= 1)
      return { status: 400 as const, message: 'You cannot leave the team as the last member' };
    if (!members.some(member => member.userId === userId))
      return { status: 404 as const, message: 'User is not a member of this team' };
    await tx
      .delete(teamMember)
      .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)));
    await retractUnseenNotifications(tx, {
      type: 'team.member.joined',
      entityType: 'team',
      entityId: teamId,
      actorUserId: userId,
    });
    // The former member must also refetch: this team's history is no longer visible to them.
    await notifyUser(tx, userId);
    return { status: 200 as const, data: { success: true } };
  });
}

export async function patchTeamMember(
  teamId: string,
  userId: string,
  callerId: string,
  patch: { role?: 'owner' | 'member'; autoAddDeck?: boolean },
) {
  return db.transaction(async tx => {
    const membership = await lockMembership(tx, teamId, callerId);
    if (!membership) return { status: 403 as const, message: 'You must be a team member' };
    const isOwner = membership.role === 'owner';
    if (patch.role !== undefined && !isOwner)
      return { status: 403 as const, message: 'Only owners can change member roles' };
    if (patch.autoAddDeck !== undefined && !isOwner && callerId !== userId)
      return {
        status: 403 as const,
        message: 'You can only change your own auto-add deck setting',
      };
    const [target] = await tx
      .select()
      .from(teamMember)
      .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)));
    if (!target) return { status: 404 as const, message: 'User is not a member of this team' };
    if (patch.role !== undefined && target.role === patch.role)
      return { status: 400 as const, message: `User already has the role "${patch.role}"` };
    if (patch.role === undefined && patch.autoAddDeck === undefined)
      return { status: 400 as const, message: 'No changes provided' };
    await tx
      .update(teamMember)
      .set(patch)
      .where(and(eq(teamMember.teamId, teamId), eq(teamMember.userId, userId)));
    return { status: 200 as const, data: { success: true } };
  });
}

export async function deleteTeam(
  teamId: string,
  ownerId: string,
  storage: UserFileObjectStorage = createUserFileStorage(),
) {
  let headerKey: string | null = null;
  const result = await db.transaction(async tx => {
    if ((await lockMembership(tx, teamId, ownerId))?.role !== 'owner')
      return { status: 403 as const, message: 'Only team owners can delete teams' };
    const members = await tx
      .select({ userId: teamMember.userId })
      .from(teamMember)
      .where(eq(teamMember.teamId, teamId))
      .limit(2);
    if (members.length !== 1)
      return {
        status: 400 as const,
        message: 'Kick all other players out of the team before deleting it',
      };
    const [header] = await tx
      .select({ key: teamHeader.imageKey })
      .from(teamHeader)
      .where(eq(teamHeader.teamId, teamId));
    headerKey = header?.key ?? null;
    await tx.delete(team).where(eq(team.id, teamId));
    await notifyUser(tx, ownerId);
    return { status: 200 as const, data: { success: true } };
  });
  if (result.status === 200) await cleanupHeaderObject(storage, headerKey, 'Team header');
  return result;
}
