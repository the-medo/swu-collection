import { and, eq } from 'drizzle-orm';
import { creatorProfile, creatorMember } from '../../db/schema/creator_hub.ts';
import type { Connection } from './types.ts';
import { CreatorError } from './errors.ts';

export async function requireCreator(
  database: Connection,
  creatorId: string,
  viewerId: string,
  ownerOnly = false,
  lock = false,
) {
  const query = database.select().from(creatorProfile).where(eq(creatorProfile.id, creatorId));
  const [profile] = lock ? await query.for('update') : await query;
  if (!profile) throw new CreatorError('Creator not found.', 404);
  if (!profile.ownerId) throw new CreatorError('You cannot manage this creator.', 403);
  if (profile.ownerId === viewerId) return profile;
  if (!ownerOnly) {
    const [member] = await database
      .select()
      .from(creatorMember)
      .where(and(eq(creatorMember.creatorId, creatorId), eq(creatorMember.userId, viewerId)));
    if (member) return profile;
  }
  throw new CreatorError('You cannot manage this creator.', 403);
}
